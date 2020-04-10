// pages/ReduceBlock/ReduceBlock.js
var phone, user, canReduce;
const Util = require('../../utils/util');
import Dialog from '../../miniprogram_npm/vant-weapp/dialog/dialog';
Page({

    /**
     * 页面的初始数据
     */
    data: {
        user:null,
        phoneMatch:false,
        canReduce:false
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#4A90E2' });
        wx.setNavigationBarTitle({ title: '用户减免受限' });
    },
    checkNumber:function(e){
        let phoneCheck = e.detail.value;
        let exp = new RegExp(/1\d{10}/g);
        let res = exp.exec(phoneCheck);
        user = null;
        if (res){
            phone = phoneCheck;
            this.setData({phoneMatch:true,user:null})
        }else{
            phone = null;
            this.setData({ phoneMatch: false, user: null })
        }
    },
    checkUser:function(){
        wx.showLoading({
            title: '查询中',
        })
        Util.getUserScores(phone, (userStatus)=>{
            wx.hideLoading();
            if (userStatus){
                user = userStatus;
                this.setUser();
            }else{
                wx.showToast({
                    title: '无法找到该用户',
                    icon:'none'
                })
            }
        })
    },
    setUser:function(){
        if (user.count_unlock_block >= 3) {
            user.isBlock = true;
            user.block_status = '已受限';
        } else {
            user.isBlock = false;
            user.block_status = '未受限';
        }
        if (user.count_unlock_block > 0) {
            canReduce = true;
        } else {
            canReduce = false;
        }
        this.setData({ user, canReduce })
    },
    reduceUser:function(){
        Dialog.confirm({
            title: '减免提醒',
            message: '确定是否减免当前用户限制计数?'
        }).then(() => {
            wx.showLoading({
                title: '减免中',
            })
            Util.reduceUserBlock(phone,(status)=>{
                wx.hideLoading();
                if(status){
                    user.count_unlock_block--;
                    this.setUser();
                }else{
                    wx.showToast({
                        title: '减免失败',
                    })
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