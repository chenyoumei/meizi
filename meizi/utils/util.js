var app = getApp();

var util = module.exports = {
    formatUTCTime: formatUTCTime,
    formatTime: formatTime,
    formatDate: formatDate,
    LogType:{
        //错误信息
        ERROR_LOCK_LOCK         :0xF101,
        ERROR_LOCK_LOCK_INSTEAD :0xF102,
        ERROR_LOCK_UNLOCK       :0xF111,
        ERROR_LOCK_UNLOCK_BLE   :0xF112,
        LOCK_UNLOCK_TRACE       :0x0113,
    },
    getPhoneNumber: function (e,callback) {
        console.log('GetPhoneNumber');
        wx.request({
            url: `${app.globalData.baseAPIUrl}/extra/getWXPhoneNumber`,
            data: {
                encryptedData: e.detail.encryptedData,
                iv: e.detail.iv,
                session_key: app.globalData.session_key,
                openid: app.globalData.openID
            },
            method: 'POST',
            dataType: 'json',
            timeout:10000,
            success:(res)=>{
                if (res.data.statusCode == 0 && res.data.data.phoneNumber) {
                    wx.setStorageSync('phone', res.data.data.phoneNumber);
                    app.globalData.userPhone = res.data.data.phoneNumber;
                    callback(1);
                }else{
                    callback(0);
                }
            },
            fail: function (res) {
                // util.getPhoneNumber(e,callback);
                callback(0);
            }
        });
    },
    //恶心的FormID
    getFormId: function (e) {
        app = getApp();
        let formId = e.detail.formId;
        console.log('FormID',formId);
        if (formId && formId !== 'the formId is a mock one') {
            console.log('发送FormID');
            util.sendFormID(formId);
        }
    },
    sendLogin:function(callback){
        app = getApp();
        let infoCallback = ()=>{};
        if(callback) infoCallback = callback;
        // let data = { openid: app.globalData.openID, nickname: app.globalData.userInfo.nickName, avatar: app.globalData.userInfo.avatarUrl};
        let data = { openid: app.globalData.openID};
        if(app.globalData.query){
            if(app.globalData.query.scene){
                let scene = (app.globalData.query.scene).split('@');
                if(scene.length==2){
                    data.deviceName = scene[0];
                    data.deviceID = scene[1];
                }
            } else if (app.globalData.query.serial){
                data.serial = app.globalData.query.serial;
            }
        }
        console.log('准备发送登录信息')
        wx.request({
            timeout:5000,
            url: `${app.globalData.baseAPIUrl}/customer/login`,
            method:'POST',
            data: data,
            success:(r)=>{
                console.info('Login result:',r.data)
                let result = r.data;
                if(result.statusCode==1){
                    app.globalData.userID = result.data.userid;
                    if(result.data.score) app.globalData.userScore = result.data.score;
                    result.data.canMultiBorrow = Number(result.data.canMultiBorrow);
                    if (result.data.isBlock==1) app.globalData.userBlocked = true;
                    if (result.data.canMultiBorrow & 1) app.globalData.canMultiBorrow = true;
                    if (result.data.canMultiBorrow & 2) app.globalData.canTestBLE = true;
                    if ((result.data.canMultiBorrow & 4) == 4) app.globalData.hasAssistRight = true;
                    if ((result.data.canMultiBorrow & 8) == 8) app.globalData.canReduceUserBlock = true;
                    if ((result.data.canMultiBorrow & 16) == 16) app.globalData.canClearUserOrder = true;
                    console.log(app.globalData)
                    if (result.data.phone && result.data.phone!=''){
                        wx.setStorage({key:'phone', data:result.data.phone,fail:()=>{
                            wx.setStorage({key:'phone', data:result.data.phone});
                        }});
                        app.globalData.userPhone = result.data.phone;
                    }else if(app.globalData.userPhone){
                        util.saveUserPhone();
                    }
                    if(result.data.hasOrder==1){
                        app.globalData.orderStatus.hasOrder = true;
                        for(let order of result.data.orders){
                            order.changeTime = Number(order.changeTime);
                            app.globalData.orderStatus.orders.push(order.orderID);
                            app.globalData.orderStatus.orderMap[order.orderID] = order;
                        }
                        let currentOrderID = app.globalData.orderStatus.orders[0];
                        app.globalData.device = app.globalData.orderStatus.orderMap[currentOrderID];
                        if(app.globalData.canMultiBorrow){
                            infoCallback();
                        }else{
                            util.checkLockStatus(infoCallback)
                        }
                    }else{
                        console.info('User Logined');
                        infoCallback();
                    }
                }
            },
            fail:function(){
                util.sendLogin(callback);
            }
        })
    },
    //发送错误信息
    sendLog:function(type,param){
        wx.request({
            timeout:10000,
            url: `${app.globalData.lockAPIUrl}/lock/addLog`,
            method: 'POST',
            data: { deviceID: app.globalData.device.deviceID,param,userPhone: app.globalData.userPhone,type},
            success: function () { },
            fail:function(){
                util.sendLog(type,param)
            }
        })
    },
    //避免前后端数据不同步
    saveUserPhone:function(){
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/customer/savePhoneToUser`,
            method: 'POST',
            data: { userID: app.globalData.userID, openID: app.globalData.openID,userPhone: app.globalData.userPhone},
            success: function () { },
            fail:function(){
                util.saveUserPhone()
            }
        })
    },
    //获取锁当前状态
    checkLockStatus:function(callback){
        if(!app.globalData.device.deviceID){
            if(callback) callback(0xF1,null);
            return;
        }
        wx.request({
            timeout:10000,
            url: `${app.globalData.lockAPIUrl}/lock/getLockStatus`,
            method: 'POST',
            data: { deviceName: app.globalData.device.deviceName, deviceID: app.globalData.device.deviceID, userPhone: app.globalData.userPhone, userDevice: app.globalData.userDevice },
            success: function (res) {
                let rr = res.data;
                console.log('getLockStatus',res);
                if (rr.statusCode != 1 && callback) return callback(0xF1,null);
                // app.globalData.storeName = rr.data.storename;
                // app.globalData.storeHelpImg = rr.data.storehelpimg;
                // app.globalData.online = Number(rr.data.online);
                // app.globalData.changeTime = Number(rr.data.changeTime);
                // app.globalData.uptime = Number(rr.data.uptime);
                let data = {
                    orderID      :rr.data.orderid,
                    deviceID     :rr.data.deviceID,
                    deviceName   :rr.data.deviceName,
                    deviceSerial :rr.data.deviceSerial,
                    online       :Number(rr.data.online),
                    status       :Number(rr.data.status),
                    userMatch    :Number(rr.data.userMatch),
                    uptime       :Number(rr.data.uptime),
                    changeTime   :Number(rr.data.changeTime),
                    storeName    :rr.data.storename,
                    storeHelpImg :rr.data.storehelpimg,
                    storeID      :rr.data.storeid
                };
                app.globalData.device = data;
                if (callback) callback(null,data);
            },
            fail:function(){
                util.checkLockStatus(callback)
                // if (callback) callback(0xF1);
            }

        })
    },
    //获取锁当前状态
    checkLockStatusBySerial: function (serial,callback) {
        if (!serial) {
            if (callback) callback(0xF1, null);
            return;
        }
        wx.request({
            timeout: 10000,
            url: `${app.globalData.lockAPIUrl}/lock/getLockStatusBySerial`,
            method: 'POST',
            data: { serial, userPhone: app.globalData.userPhone, userDevice: app.globalData.userDevice },
            success: function (res) {
                let rr = res.data;
                console.log('checkLockStatusBySerial', res);
                if (rr.statusCode != 1 && callback) return callback(0xF1, null);
                // app.globalData.storeName = rr.data.storename;
                // app.globalData.storeHelpImg = rr.data.storehelpimg;
                // app.globalData.online = Number(rr.data.online);
                // app.globalData.changeTime = Number(rr.data.changeTime);
                // app.globalData.uptime = Number(rr.data.uptime);
                let data = {
                    orderID: rr.data.orderid,
                    deviceID: rr.data.deviceID,
                    deviceName: rr.data.deviceName,
                    deviceSerial: rr.data.deviceSerial,
                    online: Number(rr.data.online),
                    status: Number(rr.data.status),
                    userMatch: Number(rr.data.userMatch),
                    uptime: Number(rr.data.uptime),
                    changeTime: Number(rr.data.changeTime),
                    storeName: rr.data.storename,
                    storeHelpImg: rr.data.storehelpimg,
                    storeID: rr.data.storeid
                };
                app.globalData.device = data;
                if (callback) callback(null, data);
            },
            fail: function () {
                util.checkLockStatusBySerial(serial,callback)
                // if (callback) callback(0xF1);
            }
        })
    },
    //管理员操作
    getLockStatus:function(deviceID,callback){
        wx.request({
            timeout:10000,
            url: `${app.globalData.lockAPIUrl}/lock/getLockStatus`,
            method: 'POST',
            data: {deviceID, userPhone: app.globalData.userPhone},
            success: function (res) {
                let rr = res.data;
                if (rr.statusCode != 1 && callback) return callback(0xF1,null);
                // app.globalData.storeName = rr.data.storename;
                // app.globalData.storeHelpImg = rr.data.storehelpimg;
                // app.globalData.online = Number(rr.data.online);
                // app.globalData.changeTime = Number(rr.data.changeTime);
                // app.globalData.uptime = Number(rr.data.uptime);
                let data = {
                    orderID      :rr.data.orderid,
                    deviceID     :rr.data.deviceID,
                    deviceName   :rr.data.deviceName,
                    deviceSerial :rr.data.deviceSerial,
                    online       :Number(rr.data.online),
                    status       :Number(rr.data.status),
                    userMatch    :Number(rr.data.userMatch),
                    uptime       :Number(rr.data.uptime),
                    changeTime   :Number(rr.data.changeTime),
                    storeName    :rr.data.storename,
                    storeHelpImg :rr.data.storehelpimg,
                    storeID      :rr.data.storeid,
                };
                if (callback) callback(null,data);
            },
            fail:function(){
                util.getLockStatus(deviceID,callback)
                // if (callback) callback(0xF1);
            }

        })
    },
    //管理员操作
    getLockStatusBySerial: function (serial, callback) {
        console.log(serial)
        wx.request({
            timeout: 10000,
            url: `${app.globalData.lockAPIUrl}/lock/getLockStatusBySerial`,
            method: 'POST',
            data: { serial, userPhone: app.globalData.userPhone },
            success: function (res) {
                console.log(res)
                let rr = res.data;
                if (rr.statusCode != 1 && callback) return callback(0xF1, null);
                // app.globalData.storeName = rr.data.storename;
                // app.globalData.storeHelpImg = rr.data.storehelpimg;
                // app.globalData.online = Number(rr.data.online);
                // app.globalData.changeTime = Number(rr.data.changeTime);
                // app.globalData.uptime = Number(rr.data.uptime);
                let data = {
                    orderID: rr.data.orderid,
                    deviceID: rr.data.deviceID,
                    deviceName: rr.data.deviceName,
                    deviceSerial: rr.data.deviceSerial,
                    online: Number(rr.data.online),
                    status: Number(rr.data.status),
                    userMatch: Number(rr.data.userMatch),
                    uptime: Number(rr.data.uptime),
                    changeTime: Number(rr.data.changeTime),
                    storeName: rr.data.storename,
                    storeHelpImg: rr.data.storehelpimg,
                    storeID: rr.data.storeid,
                };
                if (callback) callback(null, data);
            },
            fail: function () {
                util.getLockStatusBySerial(serial, callback)
                // if (callback) callback(0xF1);
            }

        })
    },
    //正常解锁操作
    openLock: function(callback) {
        console.log('设备准备解锁',app.globalData.device.deviceName, app.globalData.device.deviceID, app.globalData.userPhone);
        let orderID;
        wx.request({
            timeout:3000,
            url: `${app.globalData.lockAPIUrl}/lock/openLock`,
            method:'POST',
            data: { deviceName: app.globalData.device.deviceName, deviceID: app.globalData.device.deviceID, userPhone: app.globalData.userPhone, userDevice: app.globalData.userDevice,type:'AC'},
            success:function(res){
                let rr = res.data;
                if(rr.statusCode==1){
                    orderID = rr.data.orderid;
                    setTimeout(autoCheck,1000);
                }else{
                    // util.sendLog(util.LogType.ERROR_LOCK_UNLOCK,'Unlock Fail');
                    if(callback) callback(false);
                }
            },
            fail:function(){
                setTimeout(()=>{util.openLock(callback);},1000);
            }
        });
        function autoCheck(){
            wx.request({
                timeout:3000,
                url: `${app.globalData.baseAPIUrl}/lock/checkOrderStatus`,
                method:'POST',
                data: {orderID},
                success:function(res){
                    // console.log(res);
                    let rr = res.data;
                    if(rr.statusCode==1){
                        if(rr.data.status == 'pending'){
                            setTimeout(autoCheck,2000);
                        }else if(rr.data.status == 'success'){
                            if (callback) callback(orderID);
                            app.globalData.device.orderID = rr.data.orderid;
                            app.globalData.orderStatus.hasOrder = true;
                            let order = {
                                orderID    : rr.data.orderid,
                                deviceID   : app.globalData.device.deviceID,
                                deviceName : app.globalData.device.deviceName,
                                changeTime : new Date().getTime()
                            }
                            app.globalData.orderStatus.orders.push(order.orderID);
                            app.globalData.orderStatus.orderMap[order.orderID] = order;
                        }else if(rr.data.status == 'fail'){
                            // util.sendLog(util.LogType.ERROR_LOCK_UNLOCK,rr.data.msg?rr.data.msg:'Unlock Fail');
                            if(callback) callback(false);
                        }else{
                            setTimeout(autoCheck,2000);
                        }
                        // wx.setStorageSync('orderid', rr.data.orderid);
                    }else{
                        if (callback) callback(false);
                    }
                },
                fail:function(){
                    // util.sendLog(util.LogType.ERROR_LOCK_UNLOCK,'Bad network');
                    // if(callback) callback(false);
                    autoCheck();
                }
            });
        }
    },
    //发送FormID以供发送消息
    sendFormID:function(formid){
        app = getApp();
        wx.request({
            url: `${app.globalData.baseAPIUrl}/customer/storeFormId`,
            method: 'POST',
            data: { formID: formid, userPhone: app.globalData.userPhone},
            success: function (res) { }
        })
    },
    //获取历史借车列表
    getBorrowHistory:function(callback){
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/customer/unlockHistory`,
            method: 'POST',
            data: { userID: app.globalData.userID },
            // timeout:3000,
            success: function (res) {
                let result = res.data;
                if(result.statusCode==1){
                    if (callback) callback(result.data);
                }else{
                    if (callback) callback(null)
                }
            },
            fail:function(){
                util.getBorrowHistory(callback)
                // if(callback) callback(null)
            }

        })
    },
    //查询用户积分
    getNewScore:function(callback){
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/customer/getScore`,
            method: 'POST',
            data: {userPhone: app.globalData.userPhone},
            success: function (res) {
                let rr = res.data;
                if(rr.statusCode==1){
                    callback(rr.data.score);
                }else{
                    callback(0);
                }
            },
            fail:function(){
                util.getNewScore(callback)
            }
        })
    },
    //向服务器设置代还标记
    setRestoreFlag:function(noExpire,deviceID,callback){
        noExpire = noExpire?1:0;
        wx.request({
            timeout:10000,
            url: `${app.globalData.lockAPIUrl}/lock/setInsteadFlag`,
            method: 'POST',
            data: { deviceID: deviceID?deviceID:app.globalData.device.deviceID, userPhone: app.globalData.userPhone,noExpire},
            success: function (res) {
                if(callback) callback();
            },
            fail:function(){
                util.setRestoreFlag(noExpire,deviceID,callback)
            }
        })
    },
    //发送主动还车检查
    sendRestoreCheck:function(isBLE){
        let type = isBLE?2:1;
        wx.request({
            timeout:10000,
            url: `${app.globalData.lockAPIUrl}/lock/restoreByUser`,
            method: 'POST',
            data: { deviceID: app.globalData.device.deviceID, userPhone: app.globalData.userPhone,type},
            success: function (res) { },
            fail:function(){
                util.sendRestoreCheck(isBLE);
            }
        })
    },
    //发送蓝牙解锁状态
    sendBLEUnlockRequest:function(callback){
        wx.request({
            timeout:10000,
            url: `${app.globalData.lockAPIUrl}/lock/openBLELock`,
            method: 'POST',
            data: { deviceName: app.globalData.device.deviceName, deviceID: app.globalData.device.deviceID, userPhone: app.globalData.userPhone, userDevice: app.globalData.userDevice },
            success: function (res) {
                let rr = res.data;
                // console.log(res);
                if(!rr.data.orderid) return;
                callback(rr.data.orderid);
                // app.globalData.orderID = rr.data.orderid;
                // wx.setStorageSync('orderid', rr.data.orderid);
            },
            fail:function(){
                util.sendBLEUnlockRequest(callback)
            }
        })
    },
    //获取维修列表
    getRepairList:function(callback){
        let data = {cid:app.globalData.userID,sid:0};
        if(app.globalData.device && app.globalData.device.storeid) data.sid = app.globalData.device.storeid;
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/store/getRepairList`,
            method: 'POST',
            data: data,
            success: function (res) {
                let rr = res.data;
                let list = [];
                if(rr.statusCode==1){
                    list = rr.data.list;
                }
                callback(list);
            },
            fail:function(){
                util.getRepairList(callback)
            }
        })
    },
    reportLock:function(deviceID,type,callback){
        let data = {cid:app.globalData.userID,deviceID:deviceID,type};
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/lock/reportLock`,
            method: 'POST',
            data: data,
            success: function (res) {
                console.log(res)
                let rr = res.data;
                console.log(rr);
                if(rr.statusCode==1){
                    callback(null,rr.data);
                }else{
                    callback(rr.data);
                }
            },
            fail:function(){
                util.reportLock(deviceID,type,callback)
            }
        })
    },
    repairReportLock:function(serial,status,BLESerial,BLEMac,callback){
        let data = {cid:app.globalData.userID,serial,BLESerial,BLEMac,status};
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/lock/repairLock`,
            method: 'POST',
            data: data,
            success: function (res) {
                console.log(res)
                let rr = res.data;
                if(rr.statusCode==1){
                    callback(null,rr.data);
                }else{
                    callback(rr.data);
                }
            },
            fail:function(){
                util.repairReportLock(serial,status,BLESerial,BLEMac,callback);
            }
        })
    },
    //查询用户
    getUserScores:function(userphone,callback){
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/customer/getUserStatus`,
            method: 'POST',
            data: {userPhone: userphone},
            success: function (res) {
                let rr = res.data;
                if(rr.statusCode==1){
                    callback(rr.data.user);
                }else{
                    callback(null);
                }
            },
            fail:function(){
                util.getUserScores(callback)
            }
        })
    },
    //查询用户订单
    getUserOrder:function(userphone,callback){
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/customer/getUserOrder`,
            method: 'POST',
            data: {userPhone: userphone},
            success: function (res) {
                let rr = res.data;
                if(rr.statusCode==1){
                    callback(null,rr.data);
                }else{
                    callback(rr.data);
                }
            },
            fail:function(){
                util.getUserOrder(userphone,callback)
            }
        })
    },
    clearUserOrder:function(orderCID,orderID,callback){
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/customer/clearUserOrder`,
            method: 'POST',
            data: {orderCID,orderID,cid:app.globalData.userID},
            success: function (res) {
                console.log(orderCID, orderID, app.globalData.userID)
                let rr = res.data;
                if(rr.statusCode==1){
                    callback(null,rr.data);
                }else{
                    callback(rr.data);
                }
            },
            fail:function(){
                util.clearUserOrder(orderCID, orderID, callback)
            }
        })
    },
    //减免受限用户
    reduceUserBlock:function(userphone,callback){
        wx.request({
            timeout:10000,
            url: `${app.globalData.baseAPIUrl}/customer/reduceUserBlock`,
            method: 'POST',
            data: {userPhone: userphone},
            success: function (res) {
                let rr = res.data;
                if(rr.statusCode==1){
                    callback(true);
                }else{
                    callback(false);
                }
            },
            fail:function(){
                util.reduceUserBlock(callback)
            }
        })
    },
    //LoginOrder
    loginOrder:function(orderID,callback){
        wx.request({
            timeout:3000,
            url: `${app.globalData.baseAPIUrl}/extra/setTempOrder`,
            method: 'POST',
            data: {data: app.globalData.userID,order:orderID},
            success: function (res) {
                let rr = res.data;
                if(rr.statusCode==1){
                    callback(true);
                }else{
                    callback(false);
                }
            },
            fail:function(){
                util.loginOrder(callback)
            }
        })
    },
    scanResultParse:function(e,callback){
        let type,deviceName,deviceID,orderID,serial;
        if(e.path && e.path.indexOf('androidid=')){
            deviceName = e.path.match(/TTIL\w{6}/gi);
            deviceID = e.path.match(/\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/gi);
            if(deviceName) deviceName = deviceName[0];
            if(deviceID) deviceID = deviceID[0];
            type = 'LOCK';
        }
        if(e.result.indexOf('scene=')>0){
            let queryScene = e.result.split('scene=')[1];
            queryScene = queryScene.split('@');
            if(queryScene.length==2){
                if(deviceName) deviceName = queryScene[0];
                if(deviceID) deviceID = queryScene[1];
                type = 'LOCK';
            }else{
                if(callback) return callback('您可能扫描了小程序不支持的二维码\n请重试');
            }
        } 
        if (e.result.indexOf('serial=') > 0) {
            let querySerial = e.result.split('serial=')[1];
            if (querySerial){
                serial = querySerial;
                type = 'LOCK_SERIAL';
            }else {
                if (callback) return callback('您可能扫描了小程序不支持的二维码\n请重试');
            }
        }
        if (e.result.indexOf('/orderLogin') > 0 && res.result.indexOf('order=') > 0){
            orderID = e.result.split('order=')[1];
            type = 'ORDER';
            if (!orderID){
                if (callback) return callback('您可能扫描了小程序不支持的二维码\n请重试');
            }
        }
        if (callback) callback(null, { type, deviceName, deviceID, orderID, serial});
    }
}


function formatDate(date){
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()

    return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}
function formatTime(date){
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    let arr = [];
    if (hour > 0) arr.push(hour)
    arr.push(minute, second);
    return arr.map(formatNumber).join(':')
}

function formatUTCTime(date){
    const day = Math.floor(date.getTime()/86400000);
    var hour = day*24+date.getUTCHours();
    const minute = date.getUTCMinutes()
    const second = date.getUTCSeconds()
    let arr = [];
    if (hour > 0) arr.push(hour)
    arr.push(minute, second);
    return arr.map(formatNumber).join(':')
}

function formatNumber(n){
    n = n.toString()
    return n[1] ? n : '0' + n
}
