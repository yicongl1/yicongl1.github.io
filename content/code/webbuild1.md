+++
title = "【网站搭建】hugo配置"
archetype = "home"
+++

# 使用hugo搭建网站
## 前期准备
### 1）安装go语言
从All releases - The Go Programming Language下载.msi安装包，并安装到选定目录下。


在终端输入go version以验证安装成功。

### 2）安装hugo
在Releases · gohugoio/hugo下载hugo，然后讲hugo.exe所在目录添加至系统环境变量Path下。

在终端输入`hugo version`验证。

## 网站部署
### 1）创建一个新网站
`hugo new site page-name`

### 2）配置主题
在[Hugo Themes](https://themes.gohugo.io/)里挑选喜欢的主题，并输入以下代码配置：
```
cd page-name
git init
git submodule add web-URL-or-ssh-key themes/theme-name
```
使用 Visual Studio Code 打开网站所在目录，在网站配置文件config.toml中输入：

`theme = "theme-name"`

### 3）添加内容
输入代码添加内容：

`hugo new posts/post-name.md`

关于Markdown语言的语法可以在Markdown 官方教程中查看:
[markdown官网](https://markdown.com.cn/)

***

## 成果查看
输入代码启动Hugo服务器：`hugo server -D`

我们可以在`http://localhost:1313/`.查看创建我网页。

此时，我们仍可以对网站进行修改，所作的修改将同步呈现在网页中。

输入`hugo -D`生成静态网页，网站的支持文件将输出在./public/目录下。

***

## 同步到Github远程库
### 1）在Github上建立远程库

在Github上新建仓库 username.github.io，username 即 Github 用户名。

### 2）从本地上传到远程库

转到public目录，提交内容到缓冲区，连接远程库后推送至master分支。
```
cd public
git init
git add .
git commit -m "message"
git remote add origin https://github.com/user-name/user-name.github.io.git
git push -u origin master
```
### 3）更新到Github远程库

转到public目录，提交内容到缓冲区后推送至master分支。
```
cd .\Desktop\Solal2600.github.io-creator\
hugo -D
cd public
git add .
git commit -m "message"
```
推送
```
git push -u origin master
```

***

