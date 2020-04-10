// pages/AssistRestore/AssistRestore.js
var deviceID, device, restoreList=[],restoreObj={};
const Util = require('../../utils/util');
Page({

    /**
     * 页面的初始数据
     */
    data: {
        restoreList:[],device
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        restoreList = [];
        restoreObj = {};
        this.setData({ restoreList });
        wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#4A90E2' });
        wx.setNavigationBarTitle({ title: '车辆回收' });
    },
    scan: function () {
        wx.showLoading({
            title: '查询中',
        })
        wx.scanCode({
            onlyFromCamera: true,
            scanType: [],
            success: (res) => {
                console.log(res);
                let serial;
                if (res.path && res.path.indexOf('name=')>0 && res.path.indexOf('androidid=')>0) {
                    deviceID = res.path.match(/\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/g);
                }
                if (res.result.indexOf('scene=')>0) {
                    deviceID = res.result.match(/\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/g);
                }
                if (res.result.indexOf('serial=')>0) {
                    console.log(res.result.indexOf('serial='));
                    serial = res.result.split('serial=')[1];
                    return this.getDeviceStatusBySerial(serial);
                }
                
                if (deviceID) {
                    console.log(deviceID)
                    deviceID = deviceID[0];
                    deviceID = deviceID.toLowerCase();
                    if(restoreObj[deviceID]){
                        wx.hideLoading();
                        wx.showToast({
                            title: '请勿重复添加',
                        })
                    }else{
                        this.getDeviceStatus();
                    }
                } else {
                    wx.hideLoading();
                    wx.showToast({ title: '扫码失败', icon: 'none' });
                }
            },
            fail: function (res) {
                wx.hideLoading();
                wx.showToast({ title: '扫码失败', icon: 'none' });
            },
            complete: function (res) { },
        })
    },
    getDeviceStatusBySerial:function(serial){
        Util.getLockStatusBySerial(serial, (err, res) => {
            if (err) {
                wx.hideLoading();
                wx.showToast({
                    title: '获取锁信息失败',
                })
                return;
            }
            deviceID = res.deviceID;
            deviceID = deviceID.toLowerCase();
            if (restoreObj[deviceID]) {
                wx.hideLoading();
                wx.showToast({
                    title: '请勿重复添加',
                })
                return;
            }
            device = res;
            if (device.status == 0) {
                wx.hideLoading();
                wx.showToast({
                    title: '车辆无需回收',
                })
                return;
            }
            console.log(device);
            let date = new Date(device.changeTime);
            device.time = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
            wx.hideLoading();
            this.setData({ restoreBoxShow: true, device });
        })
    },
    getDeviceStatus:function(){
        Util.getLockStatus(deviceID,(err,res)=>{
            if(err){
                wx.hideLoading();
                wx.showToast({
                    title: '获取锁信息失败',
                })
                return;
            }
            device = res;
            if(device.status==0){
                wx.hideLoading();
                wx.showToast({
                    title: '车辆无需回收',
                })
                return;
            }
            console.log(device);
            let date = new Date(device.changeTime);
            device.time = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
            wx.hideLoading();
            this.setData({ restoreBoxShow: true,device });
        })
    },
    restore:function(){
        Util.setRestoreFlag(true,deviceID);
        restoreObj[deviceID] = 1;
        restoreList.push({serial:device.deviceSerial,time:device.time});
        this.setData({ restoreList });
        this.setData({ restoreBoxShow: false });
        device = {};
    },
    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {

    }
})
