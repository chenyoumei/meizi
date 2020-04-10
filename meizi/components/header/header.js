// components/header/header.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        colorType:String
    },

    /**
     * 组件的初始数据
     */
    data: {
        colorType:'normal'
    },

    /**
     * 组件的方法列表
     */
    methods: {

    },
    ready:function(){
        this.setData({colorType:this.properties.colorType})
    }
})
