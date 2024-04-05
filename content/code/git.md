+++
title = "Git使用学习"
archetype = "home"
+++

[本文参考资料](https://blog.csdn.net/a18307096730/article/details/124586216?spm=1001.2014.3001.5502)

## Git概述
Linus团队开发的一种分布式版本控制工具  
所有电脑都有完整的版本库，以及一个共享版本库，不容易宕机  
优势：备份/代码还原/协同开发/追溯问题代码的编写人和编写时间/无需中心服务器   
下载地址：<https://git-scm.com/download>
Git GUI: Git图形界面工具  
Git Bash: Git命令行工具

## Git基本配置
1. 右键打开Git Bash
1. 设置用户信息
```
    git config --global user.name "Solal"
    git config --global user.email "solal2600@gmail.com"
```
1. 查看用户信息
```
    git config --global user.name
    git config --global user.email
```
1. 设置指令别名
``` 
    #在终端里创建bashrc文件
    touch ~/.bashrc  
    #用于输出git提交日志
    alias git-log='git log --pretty=oneline --all --graph --abbrev-commit'
    #用于输出当前目录所有文件及基本信息
    alias ll='ls -al'
    #运行bashrc文件
    source ~/.bashrc
```
1. 解决GitBash乱码问题
```
    #打开GitBash执行下面命令
    git config --global core.quotepath false
    #${git_home}/etc/bash.bashrc 文件最后加入下面两行
    export LANG="zh_CN.UTF-8" 
    export LC_ALL="zh_CN.UTF-8"
```

## Git基本工作流程
### git init（初始化）
初始化当前目录为一个本地git仓库  
初始化完成后当前目录下会多一个.git隐藏文件夹

### git add（添加）
将代码从工作区(workspace)提交到暂存区(index)
`git add .`添加所有文件、文件夹和子文件夹，包括.gitignore和以点开头的任何其他内容  
创建.gitignore，在上面写的文件名会被`git add .`忽略  

### git commit（提交）
将代码从暂存区(index)提交到本地仓库(repository)，本地仓库中保存修改的各个历史版本  
`git commit -m "注释内容"`  

### git status（查看修改状态）
1. untracked：未跟踪，新创建文件与git仓库无关联  
1. unstaged：未暂存，已有文件被修改  
1. staged：已暂存  

### git log（查看提交日志）
1. --all 显示所有分支
1. --pretty=oneline 将提交信息显示为一行
1. --abbrev-commit 使得输出的commitId更简短
1. --graph 以图的形式显示
1. --decorate 新版默认有这个参数
`git reflog` 这个指令可以看到已经删除的提交日志  

### git reset（版本回退）
`git reset --hard commitID` 其中commitID可以使用git log指令查看  


1. clone（克隆）：从远程仓库中克隆代码到本地仓库
1. fetch（抓取）：从远程库抓取到本地仓库，不进行任何的合并动作，一般操作比较少
1. pull（拉取）：从远程库拉取到本地库，自动进行合并（merge），然后放到工作区，相当于fetch+merge
1. push（推送）：修改完成后，需要和团队成员共享代码时，将代码推送到远程仓库

## 分支
### git branch（查看分支）
`git branch (branchname)` 创建分支  
`git branch -d (branchname)` 删除分支时，需要做各种检查  
`git branch -D (branchname)` 不做任何检查，强制删除  

### git checkout（检出）
从本地仓库中检出一个仓库分支然后进行修订（切换分支）
git checkout -b (branchname) 创建分支并切换

### git merge（合并）
`git merge dev01` 将dev01分支合并到当前分支   
`git merge master --allow-unrelated-histories` 之前在创建仓库时，因为有readme，
github自动添加了main分支，为了强制合并main分支，可以使用这条语句

### 解决冲突
1. 出现CONFILCT提示，处理提示中文件冲突的地方
1. git add
1. git commit

### 常见分支
1. master（生产分支）：主分支，产品交付的版本  
1. develop（开发分支）：用于同产品不同任务的合并  
1. hotfix：用于bug修复，修复完合并到master和develop分支  

## 远程仓库

### 常见托管服务
1. GitHub(https://github.com)     
是一个面向开源及私有软件项目的托管平台，因为只支持 Git 作为唯一的版本库格式进行托管
1. Gitee码云(https://gitee.com/)   
是国内的一个代码托管平台，由于服务器在国内，所以相比于 GitHub，码云速度会更快
1. GitLab(https://about.gitlab.com/)
是一个用于仓库管理系统的开源项目，使用Git作 为代码管理工具，并在此基础上搭建起来的web服务,一般用于在企业、学校等内部网络搭建git私服。

### 配置SSH公钥
`ssh-keygen -t rsa` #终端输入，然后不断回车    
`cat ~/.ssh/id_rsa.pub` #复制并黏贴在github设置里  
`ssh -T git@github.com` #验证是否配置成功  

### git remote
`git remote` 查看远程仓库  
`git remote -vv` 可看到远端服务器URL  
`git remote add <远端名称> <仓库路径>`  
1. 远端名称，默认是origin，取决于远端服务器配置  
1. 仓库路径，从远端服务器获取URL    

### git push
`git push [-f] [--set-upstream] <远端名称> <本地分支名>:<远端分支名>`
1. 例如`git push origin master:master`，表示将本地的master分支推送到origin的master分支
如果名字一样，可以只写缩写成`git push origin master`  
1. -f表示强制覆盖  
1. --set-upstream 推送时关联本地和远端分支，当已关联时，可以直接用git push
