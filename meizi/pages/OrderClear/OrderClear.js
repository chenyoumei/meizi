// pages/ReduceBlock/ReduceBlock.js
var phone, user, currentOrder;
const Util = require('../../utils/util');
import Dialog from '../../miniprogram_npm/vant-weapp/dialog/dialog';
Page({

    /**
     * 页面的初始数据
     */
    data: {
        user:null,
        order:null,
        phoneMatch:false,
        noOrder:false
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#4A90E2' });
        wx.setNavigationBarTitle({ title: '借车状态清除' });
    },
    checkNumber:function(e){
        let phoneCheck = e.detail.value;
        let exp = new RegExp(/1\d{10}/g);
        let res = exp.exec(phoneCheck);
        user = null;
        if (res){
            phone = phoneCheck;
            this.setData({phoneMatch:true,user:null,order:null,noOrder:false})
        }else{
            phone = null;
            this.setData({ phoneMatch: false, user: null, order: null, noOrder: false })
        }
        currentOrder = null;
    },
    checkUser:function(){
        wx.showLoading({
            title: '查询中',
        })
        Util.getUserOrder(phone, (err,userOrder)=>{
            wx.hideLoading();
            if(err){
                wx.showToast({
                    title: '无法找到该用户',
                    icon:'none'
                })
                return;
            }
            if (!userOrder.serial){
                this.setData({noOrder:true});
                return;
            }
            currentOrder = userOrder;
            console.log(currentOrder);
            let user = {
                score: userOrder.score,
                count_allunlock: userOrder.count_allunlock,
                count_unretore: userOrder.count_unretore
            }
            let unlockTime = new Date(userOrder.unlocktime*1000);
            let leaveTime = new Date(userOrder.lock_leave_time * 1000);
            let order = {
                serial: userOrder.serial,
                unlock_time: `${unlockTime.getFullYear()}/${unlockTime.getMonth()+1}/${unlockTime.getDate()} ${unlockTime.getHours()}:${unlockTime.getMinutes()}`,
                leave_time: `${leaveTime.getFullYear()}/${leaveTime.getMonth() + 1}/${leaveTime.getDate()} ${leaveTime.getHours()}:${leaveTime.getMinutes()}`,
                leave_place: `${userOrder.lock_leave_floor}-${userOrder.lock_leave_base}`
            }
            // console.log(order);
            this.setData({ user, order })
        })
    },
    clearOrder:function(){
        if (!currentOrder) return;
        Dialog.confirm({
            title: '清除提醒',
            message: '确定是否清除当前用户所借车辆记录？'
        }).then(() => {
            wx.showLoading({
                title: '清除中',
            })
            console.log(currentOrder)
            Util.clearUserOrder(currentOrder.cid, currentOrder.orderid,(err,status)=>{
                wx.hideLoading();
                if(err){
                    wx.showToast({
                        title: err,
                    })
                }else{
                    Dialog.alert({
                        title: '清除成功',
                        message: '解锁记录清除成功，用户需完全退出并重启小程序'
                    })
                    this.setData({ phoneMatch: true, user: null, order: null, noOrder: false });
                    currentOrder = null;
                }
            })
        }).catch(() => {
            return;
        });;
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