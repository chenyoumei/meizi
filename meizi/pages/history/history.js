// pages/history/history.js
const app = getApp()
const util = require('../../utils/util');
Page({

    /**
     * 页面的初始数据
     */
    data: {
        userInfo:{},
        hasUserInfo:true,
        historyList:[],
        score:0,
        borrowCount:0,
        restoreCount:0,
        insteadCount:0
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        wx.setNavigationBarTitle({
            title: '借车记录',
        });
        wx.setNavigationBarColor({frontColor:'#000000',backgroundColor:'#ffffff'});
        this.setData({score:app.globalData.userScore})
        // if (app.globalData.userInfo) {
        //     this.setData({
        //         userInfo: app.globalData.userInfo,
        //         hasUserInfo: true
        //     })
        // }
        wx.showLoading({mask:true})
        util.getBorrowHistory((data)=>{
            wx.hideLoading();
            if(!data || !data.list) return this.setData({'historyList':[]});
            let list = data.list;
            this.setData({
                borrowCount: data.borrowCount,
                restoreCount:data.restoreCount,
                insteadCount:data.insteadCount
            })
            if(list.length>0){
                for(let borrow of list){
                    borrow.unlocktime *=1000;
                    borrow.locktime *= 1000;
                    if(borrow.status==2){
                        borrow.lasttime = util.formatUTCTime(new Date(Number(borrow.locktime)-Number(borrow.unlocktime)));
                    }else{
                        console.log(borrow.unlocktime)
                        borrow.lasttime = util.formatUTCTime(new Date(new Date().getTime() - Number(borrow.unlocktime)));
                    }
                    borrow.borrowtime = util.formatDate(new Date(borrow.unlocktime));
                    borrow.borrowtime = borrow.borrowtime.slice(0,-3);
                    borrow.returntime = util.formatDate(new Date(borrow.locktime));
                    borrow.returntime = borrow.returntime.slice(0, -3);
                }
                this.setData({'historyList':list})
            }
        });
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
