// pages/user/user.js
var app = getApp();
// import Toast from '../../miniprogram_npm/vant-weapp/toast/toast';
Page({

    /**
     * 页面的初始数据
     */
    data: {
        userphone:'',
        AssitRight:false,
        canTestBLE:false,
        version:app.globalData.version
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#ffffff' })
        let userphone = app.globalData.userPhone.split('');
        userphone.fill('*',3,7)
        userphone = userphone.join('');
        let hasAssistRight = app.globalData.hasAssistRight;
        let hasBaseAdminRight = app.globalData.canMultiBorrow;
        let hasBLETestRight = app.globalData.canTestBLE;
        let canReduceUserBlock = app.globalData.canReduceUserBlock;
        let canClearUserOrder = app.globalData.canClearUserOrder;
        console.log(hasAssistRight, hasBaseAdminRight, hasBLETestRight, canReduceUserBlock, canClearUserOrder)
        this.setData({ userphone, AssitRight: hasAssistRight, BaseAdminRight: hasBaseAdminRight, canTestBLE: hasBLETestRight, canReduceUserBlock, canClearUserOrder})
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