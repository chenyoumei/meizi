// pages/unlock/unlock.js
import Dialog from '../../miniprogram_npm/vant-weapp/dialog/dialog';
import Toast from '../../miniprogram_npm/vant-weapp/toast/toast';

var app = getApp()
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
        wx.setNavigationBarColor({frontColor:'#ffffff',backgroundColor:'#FF6C6C'});
        app = getApp();
        if (app.globalData.autoUnlock){
            this.openLock();
            app.globalData.autoUnlock = false;
        }else{
            this.showTimeout();
            Toast('请在10秒内点击按钮进行解锁');
        }
        // wx.showToast({
        //     title: '请在10秒内点击按钮进行解锁',
        //     icon:'none'
        // })
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
    onUnload:function(){
        clearInterval(timeoutTimer);
    },
    //锁在线普通解锁操作
    openLock: function () {
        if(unlocking) return;
        clearInterval(timeoutTimer);
        let startTime = new Date().getTime();
        wx.showLoading({
            title: '开锁中',
            mask: app.globalData.HideMask
        })
        unlocking = true;
        Util.openLock((result) => {
            wx.hideLoading();
            unlocking = false;
            if (result) {
                let endTime = new Date().getTime();
                let fullTime = (endTime - startTime) / 1000;
                wx.showToast({
                    title: `开锁 ${fullTime} 秒`,
                    icon: 'success'
                })
                Util.sendLog(Util.LogType.LOCK_UNLOCK_TRACE, `${result}$TIMECOST$${(endTime - startTime)}`);
                //管理员开锁完成后回到扫码界面
                if (app.globalData.canMultiBorrow) {
                    wx.redirectTo({url:'/pages/home/home'});
                } else {
                    //普通用户进入还车界面
                    wx.redirectTo({url:'/pages/restore/restore'});
                }
            } else {
                Dialog.confirm({
                    title: '解锁失败',
                    message: '网络通讯可能出现问题，可尝试通过蓝牙方式解锁购物车~',
                    confirmButtonText:'蓝牙解锁'
                }).then(() => {
                    wx.redirectTo({url:'/pages/bleunlock/bleunlock'});
                }).catch(() => {
                    wx.redirectTo({url:'/pages/home/home'});
                });
            }
        })
    },
})