import mongoose from "mongoose";


const uservendorschema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        secondphone:{
            type:String,
            required:true
        },
        email:{
            type:String,
            unique:true,
            required:true
        },
        primaryaddress:{
            type:String,
            required:true
        },
        contactPerson:{
            type:String,
            required:false
        },
        gst:{
            type:String,
            required:false
        },
        productType:{
            type:String,
            required:false
        },
        category:{
            type:String,
            required:false
        },
        status:{
            type:String,
            default:"Active"
        }
    },{ timestamps:true}
)
export default mongoose.model("Vendor",uservendorschema)