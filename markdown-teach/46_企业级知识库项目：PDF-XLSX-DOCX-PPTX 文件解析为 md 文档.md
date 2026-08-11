# 企业级知识库项目：PDF/XLSX/DOCX/PPTX 文件解析为 md 文档

上节我们做了文档模块的数据库设计，打通了从接口到数据库的流程。

但大多数场景下，不是直接传入文档内容，而是上传文件，服务端解析后保存为文档。

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfd80OGvAuTAddt7yJoSN3hjSlyVOt9Y8KCYP6yiax5nicvQRDFIGYBYibEicLehNgxLrJ9YbEe4aA7hDzVm1DibyZUATGv6EicPK8aKs/640?wx_fmt=png&from=appmsg)

一般上传的文件解析后，都是用 markdown 格式保存解析结果。

比如 pdf 会把标题解析为 ##标题 的格式，会把其中图片提取上传 OSS，文档保留 ![](xxx.jpg) 的链接

xlsx 会把每个 sheet 解析为 ##sheetName 的格式，内容解析为 markdown 的表格格式等

这样的内容正文保存到 MongoDB 里，元数据放 PostgreSQL

当文档审核通过，发布后，会按照 markdown 格式来分块，写入向量数据库、全文检索（ElasticSearch）、知识图谱（Neo4j）等。

这节我们来写一下这个解析过程。

我们先支持这些文件类型：

- pdf
- xlsx
- docx
- pptx
- txt/md

有同学问，是用 LangChain 的 loader 来处理么？

不是

就比如 pdf，用 loader 只会提取文本，不会提取图片，我们要提取上传 oss，而且我们还想把标题转为 ##xxx 格式。

定制化需求比较多，所以自己实现各类文件的解析。

pdf 的解析流程是这样：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfdiaGcaLlepYAichDjYMwgWKMcuCpXbpKXjUjfnQqTErk63sMlL4SbMKcN3w7570LiaDVewh6RtcFYyGN1LEcBakj20pDztDicgTdE/640?wx_fmt=webp&from=appmsg)

用户上传了 pdf，我们会用 pdf-parse 这个包来解析

首先提取每页的文本

如果传了提取图片的回调函数，就提取图片上传 OSS，然后把返回的图片 url 放到那页文本后面，![](url) 这样的格式

如果提取的文本里没有表格，就解析表格然后转成 markdown 的表格放到本页后面。

然后是 xlsx 的解析流程：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfcLgBXcg00w1gfA8icazPSD1WfmFEKZHfV6DArTQOaWficpaxmeDMjb5ZRn8xZTVicpyOqxkDOuqdlxFxn7OzwfPBySyQQibDQKStA/640?wx_fmt=webp&from=appmsg)

用 exceljs 来解析用户上传的 xlsx 文件

遍历工作表 sheet，提取标题

遍历单元格，根据单元格类型来提取文本

然后根据列宽来补齐一下

转为 markdown 格式的文本就好了

如果解析失败，就换成 officeparser

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwffNicoMApDQYqFDicWic0aTiaAR2R9pDTY3rGeauvzxN6lLaicfBqLWNVTjw54YLoy4rAvCRzaNBxzhEwZjibBm9yaBla7ccy4xZ7TNQ/640?wx_fmt=webp&from=appmsg)

它会把各种文档解析成 AST，然后再生成 md

然后是 docx 的解析流程：

![](https://mmbiz.qpic.cn/sz_mmbiz_png/NMByQQfVwfeKJFuqictxIcNvXv0kau9zx6d2RecSc36HibeXtoxD5jtR9ofjvoL5IGMUyER0kuXAe72J6TyyavK1XNMLMmwK4ib8okYM10F5qU/640?wx_fmt=png&from=appmsg)

我们先用 mammoth 把 docx 的文档转为 html 格式

然后再用 turndown 把 html 转换为 markdown 就好了

最后是 pptx 的解析流程：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwffr4h2nvmNTmGZ8XsOBtIAwxYibicpiaLxHicuzWmgxTCM4S2bs8LLp5ibNojs1aBjfwox3u2ss6KYiaAgj4pTkNkmkGTbFEwLVE5xg0/640?wx_fmt=webp&from=appmsg)

pptx 本质上是压缩包，所以按照 zip 解压来处理

查找到那个 xml 的页码等元数据

按页来做转换，比如表格、title、段落等

最后也是合并为 markdown 文档

如果解析失败，也是换 officeparser 通过 AST 来转换

这样，各种文件的解析转换逻辑就理清了。

传一下完整流程：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfellEXDjGJfbzINh8DKmma7DqUEfYRPV9KK76cPEPE1pyoe98rPaGm1S5Td2ibmUCLUjyb6Pt9T4Ueet5T4kdPrxrweFaEic4icKY/640?wx_fmt=webp&from=appmsg)

这里用到 rustfs 在 docker-compose 里添加下：

![](https://mmbiz.qpic.cn/mmbiz_jpg/NMByQQfVwfeFbwWn7km7kR0Y7nHNMvBH6qnbLYYrgDG03Cdoe7HGbS98Vj5TwSeQFUceykHKEjxiawyfXlC9jxYrwXxmWecCUK17KF5ibfqlc/640?wx_fmt=webp&from=appmsg)

（从代码仓库复制）

然后我们看一下完整的代码：

**🎬 [视频 1](http://mpvideo.qpic.cn/0bc3leapeaaawyamnoc4krvfawod6jmqb4qa.f10002.mp4?dis_k=1484d1c55b13debce963b2d28a300a83&dis_t=1786439551&play_scene=10110&auth_info=DMvCj7gPeeqAtqd+GIXItcNeV0o9FDVKAixjRVFBOHYwRTFAQCZYIjl0JjVvLEZpaTJaaike&auth_key=cb9154d32fd3ec13696e716efdef36d7)**

![视频1](assets/46_video_1.gif)

分析完了解析保存的整个流程的代码，我们来测一下：

这里准备了几个文件：

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/NMByQQfVwfcWn3DiaMJ4gEEywnKksPhMEbbjmrbDghfS03XRalEIVmpxuVbHAcqPqTKRbKUNnEouOX9uwsMyuppYcqz0DoOS0h18cKErBABk/640?wx_fmt=webp&from=appmsg)

在 curl 里也是可以传文件的：

```
curl -s -X POST http://localhost:3000/documents/upload/parse \
  -F 'file=@./李先生_28岁_76761.pdf' \
  -F 'authorId=10001' \
  -F 'createBy=10001' | jq
```

跑一下：

**🎬 [视频 2](http://mpvideo.qpic.cn/0bc3bma7saabiqamy5s55rvfcc6d7efqd6ia.f10002.mp4?dis_k=f74d77bba618cbc353ecc28ee1c6e280&dis_t=1786439551&play_scene=10110&auth_info=D/7l/v5df+vX4vN+E4LPtJMOXRltFTUWVXEzFVcUa3YzEjJMEHVeI24gcjVkK0FoOWJQOXkf&auth_key=7d4a1c40e645e8132f955b9b52b539e5)**

![视频2](assets/46_video_2.gif)

这样，我们各种类型文件的解析、保存流程就测试没问题了。

> 代码上传了课程仓库： https://github.com/QuarkGluonPlasma/ai-agent-course-code

> 项目的代码会按照每节加 01、02、03 的后缀，不用担心代码和章节内容对不上，比如这节代码就是 knowledge_hub_backend_02

## 总结

这节我们完成了各种文件类型的解析。

pdf、docx、pptx、xlsx 分别用不同的工具、不同的解析流程，最终都是产出 markdown 的文档。

正文存入 MongoDB、元数据放 PostgreSQL、原始文件和提取的图片放 RustFS。

文档解析完后，就可以分块，然后做后续的向量化、全文检索存储以及知识图谱提取了。
