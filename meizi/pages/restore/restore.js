// pages/restore/restore.js
import Dialog from '../../miniprogram_npm/vant-weapp/dialog/dialog';

const app = getApp()
const BLE = app.BLE;
const Util = require('../../utils/util');
var InsteadRestore = false;
var currentDevice = null;
var RestoreCheckedLock = null;
var RestoreType = 1;
Page({

    /**
     * 页面的初始数据
     */
    data: {
        canMultiBorrow:false,
        borrowTime:'',
        restoreType:1,
        showReturnAlert:false
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        console.log(options);
        if(options.instead==1){
            InsteadRestore = true;
        }else{
            InsteadRestore = false;
        }
        if(options.type=='ble'){
            console.log('蓝牙模式还车');
            RestoreType = 2;
            this.setData({ restoreType: 2 });
        }else{
            RestoreType = 1;
            this.setData({ restoreType: 1 });
        }
        RestoreCheckedLock = null;
        wx.setNavigationBarColor({frontColor:'#ffffff',backgroundColor:'#7ED321'})
        if(app.globalData.canMultiBorrow) this.setData({canMultiBorrow:true});
        this.setData({borrowTime: `开锁时间: ${Util.formatTime(new Date(Number(app.globalData.device.changeTime)))}`});
        currentDevice = {
            orderID:app.globalData.device.orderID,
            deviceName:app.globalData.device.deviceName,
            deviceID:app.globalData.device.deviceID
        };
        console.log('准备还车',currentDevice);
        if(InsteadRestore){
            this._bleRestore();
        }else{
            this.showRestoreHelp();
        }
    },
    getFormId:Util.getFormId,
    //显示还车帮助图片
    showHelpImg: function () {
        wx.previewImage({
            urls: [app.globalData.device.storeHelpImg],
        })
    },
    //从其他界面返回扫码界面
    returnScan: function () {
        wx.redirectTo({url:'/pages/home/home'});
    },
    showRestoreHelp:function(){
        this.setData({ showReturnAlert:true});
    },
    onAlertClose:function(){
        console.log('OrderMap',app.globalData.orderStatus.orderMap);
        this.setData({ showReturnAlert:false});
    },
    restoreLockAlert:function(){
        this.checkLockStatus();
        // this.showRestoreHelp();
    },
    //还车按钮
    offlineRestoreLock: function () {
        console.log('OrderMap',app.globalData.orderStatus.orderMap);
        if((new Date().getTime()-app.globalData.device.changeTime)<=5000){
            wx.showModal({
                title: '解锁时间过短',
                content: '车辆解锁时间未超过5秒钟,请稍后再次尝试',
                showCancel:false,
                success:(res)=>{}
            });
            return;
        }
        // this._restore();
        if(RestoreCheckedLock){
            if (RestoreCheckedLock.status == 0) {
                console.log('查询到状态为上锁,还车成功');
                this.restoreSuccess();
            } else {
                if (!InsteadRestore && app.globalData.orderStatus.hasOrder && app.globalData.orderStatus.orderMap[RestoreCheckedLock.orderID] == undefined) {
                    console.log('非代还,本地订单号与线上不匹配,还车成功', app.globalData.orderStatus.hasOrder,app.globalData.orderStatus.orderMap,RestoreCheckedLock.orderID);
                    this.restoreSuccess();
                } else {
                    //离线状态,通过蓝牙还车
                    this._bleRestore();
                }
            }
        }else{
            this.checkLockStatus();
        }
    },
    restoreSuccess: function () {
        console.log('清除设备数据',currentDevice);
        let orderID = currentDevice.orderID;
        if(app.globalData.orderStatus.orderMap[orderID]){
            app.globalData.orderStatus.orderMap[orderID] = null;
            delete app.globalData.orderStatus.orderMap[orderID];
        }
        for(let i in app.globalData.orderStatus.orders){
            if(app.globalData.orderStatus.orders[i]==orderID){
                app.globalData.orderStatus.orders[i] == null;
                app.globalData.orderStatus.orders.splice(i,1);
                break;
            }
        }
        if(app.globalData.orderStatus.orders.length==0) app.globalData.orderStatus.hasOrder = false;
        app.globalData.device = {};
        wx.showToast({title: '还车成功'});

        console.log('还车成功',app.globalData);
        Util.getNewScore((score)=>{
            app.globalData.userScore = score;
            setTimeout(()=>{wx.redirectTo({url:'/pages/home/home'})},1000);
        })
    },
    checkLockStatus:function(){
        console.log('OrderMap',app.globalData.orderStatus.orderMap);
        RestoreCheckedLock = null;
        wx.showLoading({
            title: '处理中,请稍后',
            mask: app.globalData.HideMask
        })
        Util.checkLockStatus((err, lock) => {
            wx.hideLoading();
            if (err) {
                // wx.hideLoading();
                console.log('获取状态失败', err);
                wx.showToast({ title: '获取状态失败' })
                return;
            }
            RestoreCheckedLock = lock;
            //锁在线时判断当前锁状态
            if (lock.online==1) {
                this.setData({ restoreType:1});
                RestoreType = 1;
                // wx.hideLoading();
                if (lock.status == 0 || (lock.status == 1 && app.globalData.orderStatus.orderMap[lock.orderID] == undefined)) {
                    console.log('在线,已上锁')
                    //上锁状态,判定还车成功
                    this.restoreSuccess();
                } else {
                    console.log('在线,未上锁')
                    //解锁状态,等待基站上报状态
                    // Dialog.alert({
                    //     title: '还车提醒',
                    //     message: '车辆未上锁，请您将购物车推至还车点上锁还车，如您已经上锁，可忽略此消息，系统稍后会自动更新'
                    // })
                    this.showRestoreHelp();
                }
            } else {
                console.log('不在线,未上锁')
                this.showRestoreHelp();
                this.setData({ restoreType: 2 });
                RestoreType = 2;
                this._bleRestore();
            }
        });
    },
    //还车动作
    // _restore:function(){
    //     this.checkLockStatus();
    // },
    //蓝牙还车
    _bleRestore:function(){
        console.log('OrderMap',app.globalData.orderStatus.orderMap);
        wx.showLoading({
            title: '设备连接中',
            mask: app.globalData.HideMask
        })
        BLE.Control.run(app.globalData.device.deviceName,app.globalData.device.deviceID,BLE.ActionType.ListenReady,false,(err,result)=>{
            console.log(err,result);
            wx.hideLoading();
            if(err){
                if(err == BLE.StatusType.ERROR_OPEN_ADAPTER){
                    Dialog.alert({
                        title: '手机蓝牙未开启',
                        message: '系统蓝牙未打开,请手动打开后再使用蓝牙进行操作'
                    })
                }else{
                    Dialog.alert({
                        title: '连接超时',
                        message: '当前车辆连接超时或失败,请靠近购物车的智能锁处再次尝试'
                    })
                }
                return;
            }
            //上锁状态还车完成
            if(result.currentStatus==0){
                console.log('已是上锁状态');
                if(InsteadRestore) Util.setRestoreFlag();
                Util.sendRestoreCheck(true);
                BLE.Control.reset();
                this.restoreSuccess();
            }else{
                //解锁状态,需插入锁插销
                //代还
                if(InsteadRestore){
                    Dialog.confirm({
                        title: '代还提醒',
                        message: '请在点击下方按钮后的30秒内,将插销插入智能锁后方锁孔中并等待完成还车处理',
                        confirmButtonText:'准备好了'
                    }).then(() => {
                        wx.showLoading({
                            title: '请插入插销',
                            mask: app.globalData.HideMask
                        });
                        Util.setRestoreFlag();
                        //设置还车超时
                        let finished = false;
                        let timeoutTimer = setTimeout(()=>{
                            if(finished) return;
                            wx.hideLoading();
                            Dialog.alert({
                                title: '还车超时',
                                message: '还车超时,请重试'
                            })
                        },30000);
                        //注册状态变化监控,等待还车
                        BLE.Control.run(app.globalData.device.deviceName,app.globalData.device.deviceID,BLE.ActionType.ListenChange,false,(err,result)=>{
                            wx.hideLoading();
                            finished = true;
                            if(err){
                                if(err == BLE.StatusType.ERROR_OPEN_ADAPTER){
                                    Dialog.alert({
                                        title: '手机蓝牙未开启',
                                        message: '系统蓝牙未打开,请手动打开后再使用蓝牙进行操作'
                                    })
                                }else{
                                    Dialog.alert({
                                        title: '连接超时',
                                        message: '当前车辆连接超时或失败,请靠近购物车的智能锁处再次尝试'
                                    })
                                }
                                return;
                            }
                            if(result.preStatus!=result.newStatus && result.newStatus==0){
                                console.log(`代还成功`);
                                Util.sendRestoreCheck(true);
                                this.restoreSuccess();
                            }else{
                                Dialog.alert({
                                    title: '还车失败',
                                    message: '车辆状态获取失败,请重试'
                                })
                            }
                        });
                    }).catch(() => {});
                }else{
                    wx.hideLoading();
                    BLE.Control.reset();
                    this.showRestoreHelp();
                    // Dialog.alert({
                    //     title: '还车提醒',
                    //     message: '车辆未上锁，请您将购物车推至还车点并插入还车插销后再次尝试'
                    // })
                }
            }
        })
    },
})
