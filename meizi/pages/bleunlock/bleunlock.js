// pages/bleunlock/bleunlock.js
import Dialog from '../../miniprogram_npm/vant-weapp/dialog/dialog';

const app = getApp()
const BLE = app.BLE;
const Util = require('../../utils/util');
var timeoutTimer = null;
var unlocking = false;
Page({

    /**
     * 页面的初始数据
     */
    data: {
        timeout:10
    },
    getFormId:Util.getFormId,
    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        wx.setNavigationBarColor({frontColor:'#ffffff',backgroundColor:'#4A90E2'})
        this.showTimeout();
    },
    onUnload:function(){
        clearInterval(timeoutTimer);
        BLE.Control.reset();
    },
    //锁在线情况下,若扫码后10秒钟无操作,则回到扫码界面
    showTimeout: function () {
        this.setData({ timeout: 10 });
        timeoutTimer = setInterval(() => {
            this.data.timeout--;
            this.setData({timeout: this.data.timeout});
            if (this.data.timeout == 0) {
                clearInterval(timeoutTimer);
                wx.showToast({
                    title: '解锁操作超时',
                    icon: 'none'
                })
                wx.redirectTo({url:'/pages/home/home'});
            }
        }, 1000)
    },
    openBLELock: function () {
        if(!app.globalData.device || !app.globalData.device.deviceName || !app.globalData.device.deviceID){
            clearInterval(timeoutTimer);
            wx.showToast({
                title: '解锁信息错误,请重试',
                icon: 'none'
            });
            setTimeout(()=>{wx.redirectTo({url:'/pages/home/home'})},500);
            return;    
        }
        if(unlocking) return;
        clearInterval(timeoutTimer);
        let startTime = new Date().getTime();
        wx.showLoading({
            title: '蓝牙解锁中',
            mask: app.globalData.HideMask
        });
        unlocking = true;
        BLE.Control.run(app.globalData.device.deviceName,app.globalData.device.deviceID,BLE.ActionType.Unlock,false,(err,result)=>{
            unlocking = false;
            wx.hideLoading();
            if(err){
                console.log('蓝牙开锁报错',err)
                if(err == BLE.StatusType.ERROR_OPEN_ADAPTER){
                    this.showBLEAlert();
                }else if(err == BLE.StatusType.ERROR_WRITE_CMD){
                    Dialog.alert({
                        title: '开锁失败',
                        message: '开锁失败了,别灰心~再试一次吧~'
                    })
                }else if(err == BLE.StatusType.ERROR_OPENED){
                    Dialog.alert({
                        title: '开锁失败',
                        message: '当前车辆已是解锁状态,请勿重新解锁'
                    }).then(()=>{
                        wx.redirectTo({url:'/pages/home/home'});
                    });
                }else{
                    Dialog.alert({
                        title: '解锁失败',
                        message: '购物车解锁失败,别灰心~再试一次吧~'
                    })
                }
                return;
            }
            //解锁成功
            if(result.preStatus==0 && result.newStatus==1){
                let endTime = new Date().getTime();
                let fullTime = (endTime - startTime) / 1000;
                wx.showToast({title: `开锁 ${fullTime} 秒`,icon: 'success'});
                //主动向服务器发送蓝牙解锁结果,获取后台生产的orderID
                Util.sendBLEUnlockRequest((orderID)=>{
                    console.log('蓝牙开锁成功',result,'orderID',orderID);
                    Util.sendLog(Util.LogType.LOCK_UNLOCK_TRACE, `${orderID}$TIMECOST$${(endTime - startTime)}`);
                    app.globalData.orderStatus.hasOrder = true;
                    //管理员解锁后回到扫码界面
                    let order = {
                        orderID,
                        deviceID:app.globalData.device.deviceID,
                        deviceName:app.globalData.device.deviceName,
                        unlockTime:new Date().getTime()
                    }
                    app.globalData.orderStatus.hasOrder = true;
                    app.globalData.orderStatus.orders.push(orderID);
                    app.globalData.orderStatus.orderMap[orderID] = order;
                    app.globalData.device.orderID = orderID;
                    app.globalData.device.status = 1;
                    app.globalData.device.changeTime = new Date().getTime();
                    app.globalData.device.userMatch = 1;
                    if (app.globalData.canMultiBorrow) {
                        wx.redirectTo({url:'/pages/home/home'});
                    } else {
                        wx.redirectTo({url:'/pages/restore/restore'});
                    }
                });
            }else{
                Dialog.alert({
                    title: '解锁失败',
                    message: '好可惜,解锁失败了,建议您尝试解锁其他车辆~'
                })
            }
        });
    },
    //从其他界面返回扫码界面
    returnScan: function () {
        wx.redirectTo({url:'/pages/home/home'});
    },
    //显示打开蓝牙提示
    showBLEAlert: function () {
        wx.showModal({
            title: '手机蓝牙未开启',
            content: '系统蓝牙未打开,请手动打开后再使用蓝牙进行解锁或还车操作',
            showCancel: false
        })
    },
})
