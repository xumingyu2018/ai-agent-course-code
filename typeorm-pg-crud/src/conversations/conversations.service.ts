import 'dotenv/config';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { OpenAIEmbeddings } from '@langchain/openai';
import { EntityManager } from 'typeorm';
import { User } from './entities/user.entity';
import { Conversation } from './entities/conversation.entity';

export interface SemanticSearchResult {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  created_at: Date;
  similarity: number;
}

@Injectable()
export class ConversationsService {
  private embeddings: OpenAIEmbeddings | null = null;

  constructor(
    // InjectEntityManager 装饰器用于注入 TypeORM 的 EntityManager 实例，EntityManager 提供了对数据库的操作方法，em 获取操作数据库的增删改查的方法
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  /** 用户 → 会话（一对多）查询用户的所有会话 */
  async findConversationsByUserId(userId: number) {
    const user = await this.em.findOne(User, {
      where: { id: userId },
      relations: { conversations: true }, // 加上 relations 就可以关联查询
      order: { conversations: { createdAt: 'DESC' } },
    });

    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    return user;
  }

  /** 会话 → 消息（一对多）查询会话的所有消息 */
  async findMessagesByConversationId(conversationId: number) {
    const conversation = await this.em.findOne(Conversation, {
      where: { id: conversationId },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation #${conversationId} not found`);
    }

    return {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map(
        ({ id, conversationId, role, content, createdAt }) => ({
          id,
          conversationId,
          role,
          content,
          createdAt,
        }),
      ),
    };
  }

  /** 会话内语义检索（pgvector 余弦距离） */
  async searchSimilarMessages(
    conversationId: number,
    searchText: string,
    limit = 5,
  ): Promise<SemanticSearchResult[]> {
    const conversation = await this.em.findOne(Conversation, {
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation #${conversationId} not found`);
    }

    const vector = await this.embedQuery(searchText);

    // 这里向量检索是扩展的 SQL 语法，TypeORM 不支持直接使用，所以使用原生 SQL 查询
    // embedding <=> $1::vector 是 pgvector 提供的余弦距离计算方法，返回值越小表示越相似
    // 1 - (embedding <=> $1::vector) AS similarity 是为了将距离转换为相似度，越大表示越相似
    const rows: SemanticSearchResult[] = await this.em.query(
      `SELECT id, conversation_id, role, content, created_at,
              1 - (embedding <=> $1::vector) AS similarity
       FROM messages
       WHERE conversation_id = $2 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [JSON.stringify(vector), conversationId, limit],
    );

    return rows.map((row) => ({
      ...row,
      similarity: Number(row.similarity),
    }));
  }

  private getEmbeddings(): OpenAIEmbeddings {
    if (!this.embeddings) {
      if (!process.env.OPENAI_API_KEY) {
        throw new BadRequestException(
          '语义检索需要配置 OPENAI_API_KEY（与 pgsql-test 相同）',
        );
      }
      this.embeddings = new OpenAIEmbeddings({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-v3',
        apiKey: process.env.OPENAI_API_KEY,
        configuration: {
          baseURL: process.env.OPENAI_BASE_URL,
        },
      });
    }
    return this.embeddings;
  }

  private async embedQuery(text: string): Promise<number[]> {
    return this.getEmbeddings().embedQuery(text);
  }
}
