//app.js
const DEBUG = false;
const version = '4.5.2';
App({
    onLaunch: function() {
        this.updateApp()
        let device = wx.getSystemInfoSync();
        this.globalData.localDevice = device;
        this.globalData.userDevice = [device.brand, device.model, device.version, device.system, device.platform, device.SDKVersion];
        for(let i in this.globalData.userDevice){
            if(!this.globalData.userDevice[i]) continue;
            this.globalData.userDevice[i] = (this.globalData.userDevice[i]).replace(',','_');
        }
        // this.globalData.userDevice = device;
        this.globalData.openID    = wx.getStorageSync('openid');
        // this.globalData.userPhone = wx.getStorageSync('phone');  

        this.globalData.openID    = this.globalData.openID?this.globalData.openID:null;
        // this.globalData.userPhone = this.globalData.userPhone?this.globalData.userPhone:null;
        // console.log(device);
        if (DEBUG){
            //测试服务器
            this.globalData.lockAPIUrl = 'https://honorlee.natappvip.cc';
            this.globalData.baseAPIUrl = 'https://honorlee.natappvip.cc';
            // this.globalData.lockAPIUrl = 'https://commonserver.tuituigo.com';
            // this.globalData.baseAPIUrl = 'https://commonserver.tuituigo.com';
        }else{
            //正式服务器
            this.globalData.lockAPIUrl = 'https://commonserver.tuituigo.com';
            this.globalData.baseAPIUrl = 'https://commonserver.tuituigo.com';
        }
    },
    globalData: {
        lockAPIUrl: null,
        baseAPIUrl: null,
        localDevice:null,
        userDevice:null,
        userScore:0,
        userReady:false,
        userID:null,
        openID:null,
        unionID:null,
        userInfo: null,
        userPhone:null,
        userBlocked:false,
        isLogin:false,
        canMultiBorrow:false,
        canTestBLE:false,
        hasAssistRight:false,
        canReduceUserBlock:false,
        canClearUserOrder:false,
        BLETestLog:['请点击扫描扫目标锁二维码','扫码后请等待蓝牙连接后','再根据提示操作'],
        query:null,
        HideMask:DEBUG?false:true,
        orderStatus:{hasOrder:false,orders:[],orderMap:{}},
        device:{},
        autoUnlock:false,
        isDebug:DEBUG,
        // testPage:"/pages/OrderClear/OrderClear",
        version
    },
    BLE:require('./utils/ble'),
    updateApp: function () {
        if (wx.getUpdateManager == undefined) return;
        const updateManager = wx.getUpdateManager()
        updateManager.onCheckForUpdate(function (res) {
            // 请求完新版本信息的回调
            if (res.hasUpdate) {
                wx.showLoading({
                    title: '更新下载中...',
                })
            }
        })
        updateManager.onUpdateReady(function () {
            wx.hideLoading();
            wx.showModal({
                title: '更新提示',
                content: '新版本已经准备好，是否重启应用？',
                success: function (res) {
                    if (res.confirm) {
                        // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
                        updateManager.applyUpdate()
                    }
                }
            })

        })
        updateManager.onUpdateFailed(function () {
            // 新的版本下载失败
            wx.hideLoading();
            wx.showToast({ title: '下载失败...', icon: "none" });
        })
    },
})
