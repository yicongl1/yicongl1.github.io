﻿+++
title = "无人机调试"
archetype = "home"
+++


***

## 一、前期准备
### 注意事项
- 以下所指的 **地面站** ，可以理解为开发者个人电脑通过虚拟机所使用的Ubuntu系统。
- 以下所指的 **Nano** , 可以理解为Jetson Nano所使用的Ubuntu系统。
- 打开 **终端** 快捷键：<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd>
### 连接局域网
开启路由器，将Nano和地面站都连入该路由器生成的局域网。
### 虚拟机网络设置
打开VMware，在虚拟机Ubuntu关机状态下，打开虚拟机设置-网络适配器-网络连接，选择 **桥接模式** ，并勾选“复制网络连接状态”。
![ubuntu修改网络设置](/ubuntu修改网络设置.jpeg)

***

## 二、获取IP地址和设备名称
### IP地址
1. 在Nano上打开终端，输入`ifconfig`，获得IP地址
我们需要的是 **wlan0-inet** 
假设得到IP地址为：198.168.1.2 ，以下简称 **NanoIP** 

2. 同样的，在地面站打开终端，输入`ifconfig`，获得IP地址
我们需要的是 **ens33-inet**
假设得到IP地址为：198.168.1.4 ，以下简称 **地面站IP**
### 设备名称
在终端中，介于“@”和“:”之间的绿色字体，即设备名称。
假设获得以下设备名称：
“**iaxlab-desktop**” ,以下简称 **Nano设备名**
“**solal-virtual-machine**” ,以下简称 **地面站设备名**

***

## 三、配置Nano
### 修改bashrc文件
在Nano终端输入`gedit ~/.bashrc`，在bashrc文件最后一行添加：
```bash
export ROS_HOSTNAME=NanoIP
export ROS_MASTER_URI=http://NanoIP:11311`
```
以上面的NanoIP为例，这里就应该添加：
```bash
export ROS_HOSTNAME=198.168.1.2
export ROS_MASTER_URI=http://198.168.1.2:11311`
```
保存bashrc文件，然后在终端输入`source ~/.bashrc`

### 修改hosts文件
在Nano终端输入`sudo gedit /etc/hosts`，在hosts文件中添加：

```bash
地面站IP     地面站设备名
```
以上面的地面站IP和地面站设备名为例，这里就应该添加：

```bash
192.168.1.4     solal-virtual-machine
```
保存hosts文件

***

## 四、配置地面站

### 修改bashrc文件
在地面站终端输入`gedit ~/.bashrc`，在bashrc文件最后一行添加：
```bash
export ROS_HOSTNAME=地面站IP
export ROS_MASTER_URI=http://NanoIP:11311`
```
以上面的地面站IP和NanoIP为例，这里就应该添加：
```bash
export ROS_HOSTNAME=198.168.1.4
export ROS_MASTER_URI=http://198.168.1.2:11311`
```
保存bashrc文件，然后在终端输入`source ~/.bashrc`

### 修改hosts文件
在Nano终端输入`sudo gedit /etc/hosts`，在hosts文件中添加：

```bash
NanoIP     Nano设备名
```
以上面的地面站IP和地面站设备名为例，这里就应该添加：

```bash
192.168.1.2     iaxlab-desktop
```
保存hosts文件

***