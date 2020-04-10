// pages/RepairReport/RepairReport.js
var deviceID, type = 1, BLESerial, BLEMac;
var RepairLocks = {};
var repairObj = {};
const Util = require('../../utils/util');
const TYPES = {
    1:'无法上锁',
    2:'上锁后无法自动还车',
    3:'无法开锁',
    4:'机械故障',
    5:'电量不足',
    6:'车辆损坏',
    7:'其他'
}
const STATUS = {
    0: '待维修',
    1: '已维修 | 待验收',
    2: '模块变更 | 待验收',
    8: '验收未通过',
}
Page({

    /**
     * 页面的初始数据
     */
    data: {
        repairList:[],
        reportBoxShow:false,
        repairBoxShow:false,
        radio: '1', repairRadio: '1', checked: '', changeBLE:false,repairStatus:0
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#4A90E2' });
        wx.setNavigationBarTitle({title:'车辆报修'});
        Util.getRepairList((list)=>{
            if(list){
                for(let lock of list){
                    lock.tag = TYPES[lock.type];
                    lock.statusType = STATUS[lock.status];
                    RepairLocks[lock.serial] = lock;
                }
                this.setData({ repairList: list });
            }
        });
        // this.setData({ reportBoxShow:true})
    },
    onBoxClose:function(){
        this.setData({ reportBoxShow: false })
    },
    onRepairBoxClose:function(){
        this.setData({ repairBoxShow: false });
    },
    onChange:function(event) {
        this.setData({radio: event.detail});
        type = event.detail;
    },
    onClick:function(event) {
        let name = event.currentTarget.dataset;
        this.setData({radio: name.name});
        type = name.name;
    },
    onRepairClick: function (event){
        let name = event.currentTarget.dataset;
        this.setData({ repairRadio: name.name });
        type = name.name;
        if(type==2){
            this.setData({ changeBLE:true});
        }else{
            this.setData({ changeBLE:false });
        }
    },
    onRepairChange: function (event) {
        this.setData({ repairRadio: event.detail });
        type = event.detail;
    },
    onBLESerialChange:function(e){
        BLESerial = e.detail.value;
    },
    onBLEMacChange: function (e) {
        BLEMac = e.detail.value;
    },
    scan:function(){
        wx.showLoading({
            title: '请稍后',
        });
        wx.scanCode({
            onlyFromCamera: true,
            scanType: [],
            success: (res)=>{
                console.log(res);
                let serial;
                if (res.path && res.path.indexOf('name=') > 0 && res.path.indexOf('androidid=') > 0) {
                    deviceID = res.path.match(/\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/g);
                }
                if(res.result.indexOf('scene=') > 0) {
                    deviceID = res.result.match(/\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/g);
                } 
                if (res.result.indexOf('serial=') > 0) {
                    serial = res.result.split('serial=')[1];
                }
                if (deviceID){
                    deviceID = deviceID[0];
                    deviceID = deviceID.toLowerCase();
                    Util.getLockStatus(deviceID,(err,data)=>{
                        wx.hideLoading();
                        if (err) return wx.showToast({ title: '锁信息获取失败', icon: 'none' });
                        let serial = data.deviceSerial;
                        if (RepairLocks[serial]) {
                            wx.showToast({ title: '该车辆已录入', icon: 'none' });
                            return;
                        }
                        this.setData({ reportBoxShow: true });
                    })
                } else if (serial){
                    Util.getLockStatusBySerial(serial, (err, data) => {
                        wx.hideLoading();
                        if (err) return wx.showToast({ title: '锁信息获取失败', icon: 'none' });
                        deviceID = data.deviceID;
                        if (RepairLocks[serial]) {
                            wx.showToast({ title: '该车辆已录入', icon: 'none' });
                            return;
                        }
                        this.setData({ reportBoxShow: true });
                    })
                }else{
                    wx.hideLoading();
                    wx.showToast({ title: '扫码失败', icon: 'none' });
                }
            },
            fail: function(res) {
                wx.hideLoading();
                wx.showToast({ title: '扫码失败',icon:'none' });
            },
            complete: function(res) {},
        })
    },
    report:function(){
        wx.showLoading({
            title: '正在上报',
        });
        Util.reportLock(deviceID,type,(err,res)=>{
            if (!err && res && res.serial){
                let list = this.data.repairList;
                let lock = { serial: res.serial, tag: TYPES[type], deviceid: deviceID, type,status:0,statusType:STATUS[0] };
                list.push(lock);
                this.setData({ repairList: list });
                RepairLocks[res.serial] = lock
            }else{
                if(err){
                    wx.showToast({ title: err, icon: 'none' });
                }else{
                    wx.showToast({ title: '录入失败', icon: 'none' });
                }
            }
            setTimeout(()=>{wx.hideLoading();},300);
            this.setData({ reportBoxShow: false });
        });
    },
    repairSubmit:function(){
        if(this.data.repairRadio==2){
            if (!BLESerial || !BLEMac) return wx.showToast({ title: '序列号与MAC地址不能为空', icon: 'none' });
            let test = BLESerial.match(/TTIL\w{6}/g);
            if(!test || BLESerial!=test[0]){
                return wx.showToast({ title: '序列号格式错误', icon: 'none' });
            }
            test = BLEMac.match(/\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/gi);
            if (!test || BLEMac != test[0]) {
                return wx.showToast({ title: 'MAC地址格式错误', icon: 'none' });
            }
        }
        wx.showLoading({
            title: '正在提交',
        });
        let status = this.data.repairRadio;
        Util.repairReportLock(repairObj.serial, status ,BLESerial,BLEMac,(err,res)=>{
            wx.hideLoading();
            if(err){
                wx.showToast({ title: err, icon: 'none' });
            }else{
                wx.showToast({ title: '提交成功', icon: 'none' });
                repairObj.status = status;
                repairObj.statusType = STATUS[status];
                RepairLocks[repairObj.serial] = repairObj;
                let list = this.data.repairList;
                for (let i in list){
                    if (list[i]['serial'] == repairObj.serial){
                        if(status==9){
                            list.splice(i,1);
                        }else{
                            list[i] = repairObj;
                        }
                        break;
                    }
                }
                this.setData({ repairList: list, repairBoxShow:false});
            }
        });
    },
    RepairStatus:function(e){
        console.log(e.currentTarget.id);
        repairObj = RepairLocks[e.currentTarget.id];
        console.log(repairObj)
        this.setData({ repairBoxShow: true, repairStatus:repairObj.status});
        // this.setData({ repairBoxShow: true, repairStatus: 0 });
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