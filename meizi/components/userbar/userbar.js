// componet/userbar/userbar.js
const app = getApp()
const Util = require('../../utils/util');
Component({
    /**
     * 组件的初始数据
     */
    data: {
        hasUserInfo:false,
        score:0,
        userInfo:null
    },

    /**
     * 组件的方法列表
     */
    methods: {
        updateInfo:function(){
            if (app.globalData.userPhone){
                this.setData({
                    hasUserInfo:true,
                    // userInfo: app.globalData.userInfo,
                    score: app.globalData.userScore
                })
            }
        },
        checkHistory:function(){
            wx.navigateTo({
                url: '/pages/history/history',
            })
        },
        goUserInfo: function () {
            wx.navigateTo({ url: '/pages/user/user' });
        },
        getFormId: Util.getFormId,
    },
    pageLifetimes: {
        // 组件所在页面的生命周期函数
        show: function () {
            this.updateInfo();
        },
    },
    ready:function(){
        this.updateInfo();
    }
})
