// pages/BLETest/BLETest.js
var app = getApp();
var BLE = app.BLE;
var Timer,deviceName,deviceID;
Page({

    /**
     * 页面的初始数据
     */
    data: {
        consoleList:[],
        scrollTop:0,
        taskinfo:'目标设备'
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        wx.setNavigationBarTitle({
            title: '蓝牙模块测试',
        });
        wx.setNavigationBarColor({frontColor:'#ffffff',backgroundColor:'#4A90E2'});
        Timer = setInterval(this.updateList,1000);
    },
    scan:function(){
        deviceName = null;
        deviceID   = null;
        BLE.Control.reset();
        app.globalData.BLETestLog = [];
        this.setData({taskinfo:'目标设备'})
        app.globalData.BLETestLog.push('开始扫描二维码');
        wx.scanCode({
            success: (res) => {
                if (res.errMsg == 'scanCode:ok' && res.path) {
                    app.globalData.BLETestLog.push('扫码成功,解析设备')
                    console.log(res.path);
                    deviceName = res.path.match(/TTIL\w{6}/gi)[0];
                    deviceID = res.path.match(/\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/gi)[0];
                    if(deviceName && deviceID){
                        app.globalData.BLETestLog.push('解析成功');
                        app.globalData.BLETestLog.push(`目标设备:${deviceName} - ${deviceID}`);
                        this.setData({taskinfo:deviceName})
                        app.globalData.BLETestLog.push('请点击右侧按钮选择操作方式');
                    }else{
                        app.globalData.BLETestLog.push('解析失败,不支持的二维码')
                    }
                    // setTimeout(()=>{wx.redirectTo({url: '/' + res.path})},1000);
                } else {
                    app.globalData.BLETestLog.push('扫码失败,不支持的二维码')
                }
            },
            fail:function(){
                app.globalData.BLETestLog.push('扫码失败')
            },
        });
    },
    openBLELock: function () {
        console.log()
        if(!deviceName || !deviceID) return;
        let startTime = new Date().getTime();
        BLE.Control.run(deviceName,deviceID,BLE.ActionType.Unlock,false,(err,result)=>{
            if(err){
                app.globalData.BLETestLog.push('开锁失败')
                if(err == BLE.StatusType.ERROR_OPEN_ADAPTER){
                    app.globalData.BLETestLog.push('请打开手机设备蓝牙功能');
                }
                return;
            }
            //解锁成功
            if(result.preStatus==0 && result.newStatus==1){
                let endTime = new Date().getTime();
                let fullTime = (endTime - startTime) / 1000;
                app.globalData.BLETestLog.push(`开锁成功,共使用 ${fullTime} 秒`)
            }else{
                app.globalData.BLETestLog.push('开锁失败')
            }
        });
    },
    //还车动作
    restore:function(){
        if(!deviceName || !deviceID) return;
        app.globalData.BLETestLog.push('准备检查锁状态')
        BLE.Control.run(deviceName,deviceID,BLE.ActionType.ListenReady,false,(err,result)=>{
            if(err){
                app.globalData.BLETestLog.push('检查失败')
                if(err == BLE.StatusType.ERROR_OPEN_ADAPTER){
                    app.globalData.BLETestLog.push('请打开手机设备蓝牙功能');
                }
                return;
            }
            //上锁状态还车完成
            if(result.currentStatus==0){
                app.globalData.BLETestLog.push('已是上锁状态,结束任务')
                BLE.Control.reset();
            }else{
                app.globalData.BLETestLog.push('请将插销插入锁孔')
                BLE.Control.run(app.globalData.device.deviceName,app.globalData.device.deviceID,BLE.ActionType.ListenChange,false,(err,result)=>{
                    if(err){
                        if(err == BLE.StatusType.ERROR_OPEN_ADAPTER){
                            app.globalData.BLETestLog.push('请打开手机设备蓝牙功能');
                        }
                        return;
                    }
                    if(result.preStatus!=result.newStatus && result.newStatus==0){
                        app.globalData.BLETestLog.push('上锁成功')
                    }else{
                        app.globalData.BLETestLog.push('上锁失败')
                    }
                });
            }
        })
    },


    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },
    updateList:function(){
        app = getApp();
        this.setData({
            consoleList:app.globalData.BLETestLog,
            scrollTop:app.globalData.BLETestLog.length*31
        })
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
        clearInterval(Timer);
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