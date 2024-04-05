+++
title = "【网站搭建】短代码、面包屑"
archetype = "home"
+++

# 短代码“shortcode”
## 视频插入
>https://stack.jimmycai.com/writing/shortcodes

```markdown
{{< youtube VIDEO_ID >}}
{{< bilibili VIDEO_ID PART_NUMBER >}}
{{< tencent VIDEO_ID >}}
```

## icon插入
### iconify
在assets/plugins文件夹下插入iconify/iconify.icon.min.js文件    
在主config.toml下插入代码
```
[[params.plugins.js]]
link = "plugins/iconify/iconify-icon.min.js"
```
然后在文件中可以使用短代码轻松使用iconify，样例如下：    
```
 <iconify-icon icon="simple-icons:bilibili"></iconify-icon>
```
### icons8
待写，暂时没有理解如何做到的，以下是样例：
```
[[params.social]]
icon = "lab la-github" # https://icons8.com/line-awesome
url = "https://github.com/podcast-of-engineers"
# 写在config.toml里
# 目前已知的似乎lab代表着icon的尺寸
```
```
<li class="list-inline-item">
    <a href="{{.link | safeURL}}">
        <i class="lab {{.icon}}"></i>
    </a>
</li>
```
***

# breadcrumb面包屑栏

# hugo创建网页构成
{{< youtube ZFL09qhKi5I >}}
>https://gohugo.io/getting-started/directory-structure/
## archetype
用于`hugo new`的模板
## assets
需要使用Hugo Pipes程序的文件
## config
个性化设置
## content
hugo new出来文件的默认位置
如果content的子文件夹里有_index.md则会被嵌入section tree中



