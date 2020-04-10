//index.js
//获取应用实例
import Dialog from '../../miniprogram_npm/vant-weapp/dialog/dialog';
import Toast from '../../miniprogram_npm/vant-weapp/toast/toast';

var app = getApp()
const BLE = app.BLE;
const Util = require('../../utils/util');

Page({
    data: {
        query: null,
        action:0,
        showPhoneRightAlert:false
    },
    getFormId:Util.getFormId,
    //事件处理函数
    onLoad: function (query) {
        if (app.globalData.isDebug && app.globalData.testPage) {
            wx.navigateTo({ url: app.globalData.testPage });
        }
        app = getApp();
        console.log('On Load Query:', query);
        if (query) {
            if (query.scene) {
                query.scene = decodeURIComponent(query.scene).toUpperCase();
            } else if (query.q) {
                query.q = decodeURIComponent(query.q);
                if (query.q.indexOf('scene=')>0) {
                    query.scene = query.q.split('scene=')[1];
                }
                if (query.q.indexOf('/orderLogin') > 0) {
                    query.order = query.q.split('order=')[1];
                }
                if (query.q.indexOf('serial=') > 0) {
                    query.serial = query.q.split('serial=')[1];
                }
            }
            this.setData({ query: query });
            app.globalData.query = query;
        } else {
            this.setData({ query: {} });
            app.globalData.query = {};
        }
        // app.globalData.autoUnlock = false;

        // wx.hideLoading();

        wx.showLoading({ title: '登录中', mask: app.globalData.HideMask });
        this.setData({ action: 0 });
        if (app.globalData.userReady) {
            console.debug('用户信息已就绪');
            this.initData();
            this.setData({ action: 2 });
        } else {
            console.log('准备查询用户信息');
            this.checkUserInfo();
        }
        // app.onShow = ()=>{
        //     console.log('Is fake hide:',app.globalData.fakeHide)
        //     if(!app.globalData.fakeHide){
        //         if(app.globalData.device) this.checkDevice();
        //     }
        //     app.globalData.fakeHide = false;
        // };
        // app.onHide = this.onUnload = ()=>{
        //     if(!app.globalData.fakeHide){
        //         console.log('App hide');
        //         BLE.Control.reset();
        //     }
        // };
    },
    confirmRightAlert:function(){
        this.setData({ showPhoneRightAlert: false })
    },
    onAlertClose:function(){
        this.setData({showPhoneRightAlert:false})
    },
    checkUserInfo:function(){
        return this.checkOpenid();
        if (app.globalData.userInfo) {
            this.checkOpenid();
        } else if (wx.canIUse('button.open-type.getUserInfo')) {
            wx.getSetting({
                success: res => {
                    if (res.authSetting['scope.userInfo']) {
                        wx.getUserInfo({
                            success: res => {
                                app.globalData.userInfo = res.userInfo;
                                this.checkOpenid();
                            }
                        });
                    }else{
                        wx.hideLoading();
                        this.setData({action:0});
                        // wx.showToast({
                        //     title: '点击按钮允许获取信息',
                        //     icon: 'none'
                        // })
                    }
                }
            })
        } else {
            wx.getUserInfo({
                success: res => {
                    app.globalData.userInfo = res.userInfo;
                    this.checkOpenid();
                },
                fail:res =>{
                    wx.hideLoading()
                    this.setData({action:0});
                }
            });
        }
    },
    checkOpenid:function(){
        if(!app.globalData.openID){
            wx.login({
                success: res => {
                    // 发送 res.code 到后台换取 openId, sessionKey, unionId
                    wx.request({
                        url: `${app.globalData.baseAPIUrl}/wechatmp/getCode2Session`,
                        data: {code: res.code},
                        timeout:10000,
                        method: 'GET',
                        dataType: 'json',
                        success: (result) => {
                            let res = result.data;
                            console.log(res)
                            if (res.statusCode == 1) {
                                wx.setStorageSync('openid', res.data.session.openid);
                                wx.setStorageSync('unionid', res.data.session.unionid);
                                app.globalData.openID = res.data.session.openid;
                                app.globalData.unionID = res.data.session.unionid;
                                app.globalData.session_key = res.data.session.session_key;
                                Util.sendLogin(this.checkUserPhone);
                            }else{
                                this.checkOpenid();
                            }
                        },
                        fail: (res)=>{
                            this.checkOpenid();
                        }
                    })
                }
            });
        }else{
            Util.sendLogin(this.checkUserPhone);
        }
    },
    checkUserPhone:function(){
        if(app.globalData.userPhone){
            app.globalData.userReady = true;
            this.initData();
            this.setData({action:2});
        }else if(wx.canIUse('button.open-type.getPhoneNumber')){
            wx.hideLoading();
            this.setData({action:1,showPhoneRightAlert: true});
            // wx.showToast({
            //     title: '请点击按钮授权小程序识别电话号码',
            //     icon: 'none'
            // })
        }
    },
    getUserInfo: function (e) {
        console.log('GetUserInfo');
        if(e.detail.errMsg=='getUserInfo:ok'){
            wx.showLoading({title:'准备中',mask:app.globalData.HideMask})
            app.globalData.userInfo = e.detail.userInfo;
            this.checkOpenid();
        }
    },
    //Btns
    getPhoneNumber: function (e) {
        console.log('GetPhoneNumber',e);
        wx.showLoading({title:'准备中',mask:app.globalData.HideMask});
        if (e.detail.errMsg == 'getPhoneNumber:ok') {
            wx.login({
                success: res => {
                    // 发送 res.code 到后台换取 openId, sessionKey, unionId
                    wx.request({
                        url: `${app.globalData.baseAPIUrl}/wechatmp/getCode2Session`,
                        data: { code: res.code },
                        timeout: 10000,
                        method: 'GET',
                        dataType: 'json',
                        success: (result) => {
                            let res = result.data;
                            console.log(res)
                            if (res.statusCode == 1) {
                                wx.setStorageSync('openid', res.data.session.openid);
                                wx.setStorageSync('unionid', res.data.session.unionid);
                                app.globalData.openID = res.data.session.openid;
                                app.globalData.unionID = res.data.session.unionid;
                                app.globalData.session_key = res.data.session.session_key;
                                Util.getPhoneNumber(e, (status) => {
                                    if (status == 1) {
                                        app.globalData.userReady = true;
                                        app.globalData.autoUnlock = true;
                                        this.initData();
                                        Util.saveUserPhone();
                                        // this.startScanQR(true);
                                    } else {
                                        wx.hideLoading();
                                        Dialog.alert({
                                            title: '验证失败',
                                            message: '账户信息授权获取失败,请重新尝试'
                                        })
                                    }
                                });
                            } else {
                                wx.hideLoading();
                                Dialog.alert({
                                    title: '验证失败',
                                    message: '账户信息授权失败,请重新尝试'
                                })
                            }
                        },
                        fail: (res) => {
                            this.getPhoneNumber();
                        }
                    })
                }
            });
        } else {
            wx.hideLoading();
            this.setData({showPhoneRightAlert: true});
            // Dialog.alert({
            //     title: '信息授权',
            //     message: '使用智能购物车，需您同意并授权本小程序应用获取您的手机号信息。您的个人信息仅会用于解锁和使用智能购物车。'
            // })

        }
    },
    startScanQR: function (e) {
        if (!app.globalData.canMultiBorrow && app.globalData.userBlocked) {
            Dialog.alert({
                title: '账户受限',
                message: '由于您多次未主动还车,您的账户已经被限制使用车辆,请至服务台或咨询相关工作人员进行解锁'
            })
            return;
        }
        wx.showLoading({title: '请稍后',mask: app.globalData.HideMask});
        app.globalData.query = null;
        app.globalData.fakeHide = true;
        wx.scanCode({
        onlyFromCamera: true,
        success: (res)=>{
                console.log('Scan finished',res);
                if (res.errMsg == 'scanCode:ok') {
                    if(e){
                        app.globalData.autoUnlock = true;
                    }else{
                        app.globalData.autoUnlock = false;
                    }
                    if(res.path){
                        setTimeout(()=>{wx.redirectTo({url: '/' + res.path})},1000);
                        return;
                    }
                    if(res.result.indexOf('scene=')>0){
                        let queryScene = res.result.split('scene=')[1];
                        app.globalData.query = {scene:queryScene};
                        this.setData({query: queryScene});
                        return this.initData();
                    }
                    if (res.result.indexOf('serial=')>0) {
                        let querySerial = res.result.split('serial=')[1];
                        app.globalData.query = { serial: querySerial };
                        this.setData({ query: querySerial });
                        return this.initData();
                    }
                    if (res.result.indexOf('/orderLogin') > 0 && res.result.indexOf('order=') > 0){
                        console.log(res.result);
                        let order = res.result.split('order=')[1];
                        app.globalData.query = { order };
                        return this.initData();
                    }

                    wx.hideLoading();
                    Dialog.alert({
                        title: '扫码失败',
                        message: '您可能扫描了小程序不支持的二维码\n请重试'
                    })
                }else{
                    wx.hideLoading();
                    Dialog.alert({
                        title: '扫码失败',
                        message: '您可能扫描了小程序不支持的二维码\n请重试'
                    })
                }
            },
            fail:function(){
                wx.hideLoading();
                console.log('扫码失败')
            },
        });
    },
    startInsteadScanQR:function(){
        Dialog.confirm({
            title: '代还提醒',
            message: '代还车辆可获取积分，点击“扫码代还”后请将购物车推送至指定还车点，并在30秒内插入插销',
            confirmButtonText: '扫码代还'
        }).then(() => {
            this.insteadScan();
        }).catch(() => {
            
        });
    },
    insteadScan:function(){
        wx.showLoading({
            title: '请稍后',
            mask: true
        });
        wx.scanCode({
            onlyFromCamera: true,
            success:(e)=>{
                if (e.errMsg == 'scanCode:ok') {
                    Util.scanResultParse(e,(err,res)=>{
                        if (err){
                            wx.hideLoading();
                            Dialog.alert({
                                title: '扫码失败',
                                message: '您可能扫描了小程序不支持的二维码\n请重试'
                            })
                            return;
                        }
                        console.log(res)
                        if (res.type == 'LOCK'){
                            Util.getLockStatus(res.deviceID, (err, res) => { check(err, res)});
                        }
                        if(res.type == 'LOCK_SERIAL') {
                            Util.getLockStatusBySerial(res.serial, (err, res) =>{ check(err, res)});
                        }
                        function check(err, res){
                            wx.hideLoading();
                            if (err) {
                                wx.showToast({
                                    title: '获取锁信息失败',
                                    icon: 'none'
                                });
                                return;
                            }
                            let device = res;
                            if (device.status == 0) {
                                wx.showToast({
                                    title: '当前车辆无需代还',
                                    icon: 'none'
                                })
                                return;
                            }
                            if (device.userMatch == 1) {
                                wx.showToast({
                                    title: '自己所借车辆无需代还',
                                    icon: 'none'
                                })
                                return;
                            }
                            // if((new Date().getTime()-device.changeTime)<1800000){
                            //     wx.showToast({
                            //         title: '当前车辆使用未超过30分钟',
                            //         icon: 'none'
                            //     })
                            //     if(!app.globalData.isDebug) return;
                            // }
                            Dialog.confirm({
                                title: '代还提醒',
                                message: '请在点击确定后30秒内插入插销,否则视为无效代还。代还成功后积分会自动增加，请勿多次点击。',
                                confirmButtonText: '确定'
                            }).then(() => {
                                Util.setRestoreFlag(false, device.deviceID, () => {
                                    Dialog.alert({
                                        title: '代还提醒',
                                        message: '代还设置成功,请尽快插入插销。代还成功后积分会在下次打开小程序后更新。'
                                    })
                                });
                            }).catch(() => {
                                wx.showToast({
                                    title: '代还取消',
                                    icon: 'none'
                                })
                            });
                        }
                    });
                } else {
                    wx.hideLoading();
                    Dialog.alert({
                        title: '扫码失败',
                        message: '您可能扫描了小程序不支持的二维码\n请重试'
                    })
                }
            },
            fail:function(){
                wx.hideLoading();
                console.log('扫码失败')
            }
        })
    },
    //初始化数据
    initData: function () {
        console.log('初始化数据')
        this.selectComponent('#userbar').updateInfo();
        this.setData({ action: 2 });
        // console.log(app.globalData);
        //非管理员用户且当前已记录开锁
        if (!app.globalData.canMultiBorrow && app.globalData.orderStatus.hasOrder) {
            wx.hideLoading()
            console.log('非管理员用户且已有未还订单，提醒还车');
            Dialog.alert({
                title: '还车提醒',
                message: '您还有在借车辆尚未上锁归还哟，请将已借车辆移动到指定还车点锁后再次尝试。主动归还车辆还可以拿到信用分奖励~'
            }).then(()=>{
                wx.redirectTo({
                    url: '/pages/restore/restore',
                })
            });
            return;
        }
        if (!app.globalData.canMultiBorrow && app.globalData.userBlocked){
            wx.hideLoading();
            Dialog.alert({
                title: '账户受限',
                message: '由于您多次未主动还车，您的账户已经被限制使用车辆。请至服务台或咨询相关工作人员进行解锁'
            })
            return;
        }
        console.log('非特殊状态用户判定');
        //参数结果判断
        if (app.globalData.query){
            if(app.globalData.query.scene) {
                console.log('有页面参数',app.globalData.query);
                let scene = (app.globalData.query.scene).split('@');
                if (scene.length == 2 && scene[0] != '' && scene[1] != '') {
                    // app.globalData.device = {};
                    app.globalData.device = {deviceName:scene[0],deviceID:scene[1]}
                    this.checkDevice(app.globalData.device);
                }else{
                    wx.hideLoading()
                }
            } else if (app.globalData.query.serial) {
                console.log('有页面参数 Serial', app.globalData.query);
                let serial = app.globalData.query.serial;
                if (serial){
                    this.checkDeviceBySerial(serial);
                }else{
                    wx.hideLoading()
                }
            } else if (app.globalData.query.order){
                wx.hideLoading();
                wx.showLoading({
                    title: '登录中',
                })
                Util.loginOrder(app.globalData.query.order,(status)=>{
                    wx.hideLoading();
                    if(status){
                        wx.showToast({
                            title: '登录成功',
                        })
                    }else{
                        wx.showToast({
                            title: '登录失败',
                            icon:'fail'
                        })
                    }
                })
            }else{
                wx.hideLoading()
                console.log('无页面参数');   
            }
        } else {
            wx.hideLoading()
            console.log('无页面参数');   
        }
    },
    checkDeviceBySerial:function(serial){
        console.log('获取设备状态开始');
        wx.showLoading({ title: '获取设备信息', mask: app.globalData.HideMask });
        Util.checkLockStatusBySerial(serial,this.analysisLock);
    },
    //检查设备
    checkDevice: function () {
        console.log('获取设备状态开始');
        wx.showLoading({title: '获取设备信息',mask: app.globalData.HideMask});
        Util.checkLockStatus(this.analysisLock);
    },
    analysisLock:function(err,lock){
        console.log('获取设备状态结束');
        if (err) {
            wx.hideLoading()
            wx.showToast({ title: '获取状态失败' });
            return;
        }
        if ((new Date() - lock.changeTime) < 5000) {
            wx.hideLoading()
            Dialog.alert({
                title: '操作过快',
                message: '当前车辆距离最后一次操作还不到5秒钟~休息一下~请稍后再次尝试'
            });
            return;
        }
        //锁当前在线
        if (lock.online) {
            //上锁状态
            console.log('设备在线');
            if (lock.status == 0) {
                //锁可用
                wx.redirectTo({ url: '/pages/unlock/unlock' });
            } else {
                //解锁状态
                //本地记录为已借车
                wx.hideLoading()
                console.log(app.globalData.orderID, lock.orderID)
                if (app.globalData.orderStatus.hasOrder) {
                    //订单号匹配,需要还车
                    if (lock.orderID && app.globalData.orderStatus.orderMap[lock.orderID]) {
                        Dialog.alert({
                            title: '还车提醒',
                            message: '您所借的车辆尚未归还上锁哟,请将所借车辆推至指定还车点并插入插销,完成还车操作'
                        }).then(() => {
                            wx.redirectTo({ url: '/pages/restore/restore' });
                        });
                        return;
                    }
                }
                Dialog.alert({
                    title: '使用中',
                    message: '当前锁还在使用中,请扫描解锁其他车辆'
                })
            }
            //锁不在线情况
        } else {
            console.log('设备离线');
            setTimeout(() => { wx.showLoading({ title: '正在连接设备', mask: app.globalData.HideMask }) }, 200);
            setTimeout(() => {
                BLE.Control.run(app.globalData.device.deviceName, app.globalData.device.deviceID, BLE.ActionType.CheckDevice, true, (err, lockStatus) => {
                    setTimeout(() => { wx.hideLoading(); }, 500);
                    BLE.Control.clearCallback();
                    if (err) {
                        //蓝牙模块打开失败
                        if (err == BLE.StatusType.ERROR_OPEN_ADAPTER) {
                            Dialog.alert({
                                title: '手机蓝牙未开启',
                                message: '系统蓝牙未打开,请手动打开后再使用蓝牙进行操作'
                            })
                        } else {
                            Dialog.alert({
                                title: '连接超时',
                                message: '当前车辆连接超时或失败,请靠近购物车的智能锁处再次尝试'
                            })
                        }
                        return;
                    }
                    //上锁状态可直接开锁
                    if (lockStatus.currentStatus == 0) {
                        wx.redirectTo({ url: '/pages/bleunlock/bleunlock' });
                    } else {
                        if ((lock.orderID && app.globalData.orderStatus.orderMap[lock.orderID]) || lock.userMatch) {
                            //匹配,代表本人所借车
                            Dialog.alert({
                                title: '还车提醒',
                                message: '您所借的车辆尚未归还上锁哟,请将所借车辆推至指定还车点并插入插销,完成还车操作'
                            }).then(() => {
                                wx.redirectTo({ url: '/pages/restore/restore?type=ble' });
                            });
                        } else {
                            //不匹配,可以代还
                            Dialog.confirm({
                                title: '还车提醒',
                                message: '当前车辆未被正常归还,您可帮忙送回还车点并上锁,代为归还还有信用分可以拿哟~',
                                confirmButtonText: '赚信用分'
                            }).then(() => {
                                wx.redirectTo({ url: '/pages/restore/restore?type=ble&instead=1' });
                            }).catch(() => {
                                BLE.Control.reset();
                            });
                        }
                    }
                })
            }, 200);
        }
    }
});




