// pages/AssistPanel/AssistPanel.js
const app = getApp();
Page({
    data:{
        url:''
    },
    onLoad:function(){
        wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#282828' });
        // console.log(app.globalData);
        let url = `${app.globalData.baseAPIUrl}/asset/presentation/store/index.html?cid=${app.globalData.userID}&sid=${app.globalData.device.storeID}`;
        this.setData({url})
    }
})