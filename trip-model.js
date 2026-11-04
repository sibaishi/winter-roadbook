/* Budget defaults are editable planning allowances, never quoted 2027 prices. */
const TripModel = (() => {
 const categories={fuel:'油费',charge:'充电费',toll:'高速费',hotel:'住宿费',food:'餐饮费',tickets:'门票 / 接驳',parking:'停车费',other:'其他'};
 const plans={
 xinjiang:[
 ['金华','河南 / 陕西方向','jinhua','lanzhou','运输段待定','服务区车宿',['出发前补足能源与食品','途中选择正规服务区轮换休息','按疲劳状态决定当晚停靠'],0],
 ['前一晚停靠点','兰州以西 / 武威','lanzhou','wuwei','武威方向','服务区车宿',['核对停靠点至武威实际导航','沿途服务区补给','风雪加剧时就近休整'],0],
 ['武威方向','哈密','wuwei','hami','哈密方向','服务区车宿',['河西走廊运输段','核对下一处加油站营业与距离','抵达哈密方向后休息'],0],
 ['哈密','奎屯方向','hami','kuitun','urumqi','服务区车宿',['哈密出发','乌鲁木齐方向补给','奎屯方向停车休整'],0],
 ['奎屯','赛里木湖','kuitun','sayram','赛湖周边','酒店 / 民宿',['沿导航前往赛里木湖','确认景区开放与车辆准入','入住湖区外围已预订住宿'],300],
 ['赛里木湖周边','赛里木湖周边','sayram','sayram','湖区活动','酒店 / 民宿',['按开放公告安排环湖或接驳','选择当天可达观景点','下午回住处休整'],100],
 ['赛里木湖','克拉玛依 / 乌尔禾','sayram','karamay','克拉玛依方向','服务区车宿',['离开赛湖','克拉玛依方向补给','按天色选择停靠点'],0],
 ['克拉玛依方向','阿勒泰','karamay','altay','burqin','酒店',['向布尔津推进','布尔津补给与休息','前往阿勒泰已确认住宿'],0],
 ['阿勒泰','阿勒泰','altay','altay','城区周边','酒店',['睡足后再出门','选择一处当天可达雪景点','城区补给与休整'],200],
 ['阿勒泰方向','布尔津 / 喀纳斯方向','altay','kanas','burqin','酒店',['先核对景区准入与接驳','确认住宿和返程可达性','开放后再推进'],400],
 ['布尔津 / 阿勒泰方向','禾木 / 阿勒泰雪区','burqin','hemu','景区支线','酒店',['上午再次核对支线开放','禾木或阿勒泰周边择一','天气差时改城区休整'],400],
 ['阿勒泰方向','奎屯 / 乌鲁木齐方向','altay','urumqi','kuitun','服务区车宿',['离开雪区前补足能源','奎屯方向中途休息','按疲劳状态选择夜间停靠'],0],
 ['奎屯 / 乌鲁木齐方向','哈密 / 甘肃方向','urumqi','hami','运输段待定','服务区车宿',['向哈密推进','查询甘肃方向天气','按实际里程调整当晚落脚'],0],
 ['前一晚停靠点','陕西 / 河南方向','wuwei','lanzhou','运输段待定','服务区车宿',['以实际停车位置重算导航','途中服务区轮换休息','为最后一天预留精力'],0],
 ['前一晚停靠点','金华','lanzhou','jinhua','运输段待定','到家',['按当前位置重算回家距离','途中休息补给','抵达后整理车辆与账目'],0]],
 northeast:[
 ['金华','山东北部 / 河北南部','jinhua','jinan','运输段待定','服务区车宿',['出发前补足能源','山东方向途中休息','按实际进度选择服务区'],0],
 ['前一晚停靠点','沈阳 / 吉林方向','jinan','shenyang','运输段待定','服务区车宿',['按停靠点重新导航','沈阳方向补给','接近吉林方向后停车休息'],0],
 ['沈阳 / 吉林方向','吉林市','shenyang','jilin','城区休整','酒店',['抵达吉林市','入住后先休整','确认次日雾凇观景安排'],0],
 ['吉林市','吉林市','jilin','jilin','松花江方向','酒店',['前一晚查询雾凇条件','当天选已确认可达观景点','回城区补给与休整'],150],
 ['吉林市','长白山 / 二道白河','jilin','changbai','二道白河方向','酒店',['吉林出发','沿导航道路前往二道白河','入住并核对景区接驳'],0],
 ['二道白河','长白山周边','changbai','changbai','景区接驳','酒店',['核对当天开放项目','按预约安排游览','返回住宿休整'],600],
 ['二道白河','长白山周边','changbai','changbai','天气缓冲','酒店',['作为天气机动日','开放时补上前日项目','关闭时改镇区休整'],100],
 ['长白山周边','延吉','changbai','yanji','延吉方向','酒店',['离开长白山周边','沿导航前往延吉','城区晚餐与休整'],0],
 ['延吉','延吉','yanji','yanji','城区活动','酒店',['放慢节奏休整','按个人兴趣安排城区活动','为次日转场补给'],100],
 ['延吉','哈尔滨','yanji','harbin','mudanjiang','酒店',['延吉出发','牡丹江方向休息补给','前往哈尔滨已确认住宿'],0],
 ['哈尔滨','哈尔滨','harbin','harbin','城市冰雪','酒店',['核对2027活动与票务','白天城区或江畔活动','按预约安排冰雪夜景'],700],
 ['哈尔滨','哈尔滨','harbin','harbin','城市休整','酒店',['安排未完成活动','补给与整理装备','保证返程前休息'],150],
 ['哈尔滨','辽宁 / 河北方向','harbin','shenyang','运输段待定','服务区车宿',['哈尔滨出发','辽宁方向服务区补给','按疲劳状态停靠'],0],
 ['前一晚停靠点','山东 / 江苏方向','shenyang','jinan','运输段待定','服务区车宿',['按实际停车点重算导航','沿途轮换与休息','向山东或江苏推进'],0],
 ['前一晚停靠点','金华','jinan','jinhua','运输段待定','到家',['按实际位置重算到家里程','途中休息','抵达后汇总支出'],0]]};
 const defaults=route=>({oil:10.5,oilPrice:8.5,electric:35,electricPrice:1.2,chargeLoss:12,timeValue:30,tollRate:.45,hotel:route==='xinjiang'?300:250,food:120,other:20,parking:10,reserve:15,shoppingBudget:0,shoppingActual:null,startDate:''});
 function distance(day){const nums=day[1].match(/[\d,]+/g);if(!nums)return 80;const n=nums.map(v=>Number(v.replaceAll(',','')));return n.length>1?(n[0]+n[1])/2:n[0];}
 function allowance(route,index,day){const transport=/运输|返程/.test(day[2]),core=(route==='xinjiang'?[4,10]:[5,10]).includes(index);return {km:distance(day),electricKm:0,energyMode:'auto',chargeState:transport?'none':'planned',chargeKwh:20,detourKm:transport?10:0,chargeMinutes:transport?45:0,chargeFee:0,highwayShare:transport?1:/转场|到达|景观/.test(day[2])?.6:0,hotelNights:/酒店/.test(plans[route][index][5])?1:0,ticket:core?plans[route][index][7]:0,freeToll:false};}
 function energy(params,allow){
  const fuelPerKm=params.oil/100*params.oilPrice;
  const baseline={name:'不外接充电 · 混动',electricKm:0,kwh:0,liters:allow.km*params.oil/100,fuel:allow.km*fuelPerKm,charge:0,timeCost:0,detourKm:0,minutes:0,available:true};
  baseline.cash=baseline.fuel;baseline.generalized=baseline.cash;
  const available=allow.chargeState!=='none'&&params.electric>0;
  const maxKm=available?Math.min(allow.km,Math.max(0,allow.chargeKwh)*100/params.electric):0;
  const evKm=allow.energyMode==='manual'?Math.min(maxKm,Math.max(0,allow.electricKm)):maxKm;
  const kwh=evKm*params.electric/100,gridKwh=kwh/(1-Math.min(99,params.chargeLoss)/100);
  const detour=evKm>0&&allow.chargeState!=='carried'?Math.max(0,allow.detourKm):0,minutes=evKm>0&&allow.chargeState!=='carried'?Math.max(0,allow.chargeMinutes):0;
  const charged={name:evKm>=allow.km&&allow.km>0?'短途纯电方案':'补电 + 混动',electricKm:evKm,kwh,gridKwh,liters:(allow.km-evKm+detour)*params.oil/100,fuel:(allow.km-evKm+detour)*fuelPerKm,charge:evKm>0?gridKwh*params.electricPrice+(allow.chargeState==='carried'?0:Math.max(0,allow.chargeFee)):0,timeCost:minutes/60*params.timeValue,detourKm:detour,minutes,available:available&&evKm>0};
  charged.cash=charged.fuel+charged.charge;charged.generalized=charged.cash+charged.timeCost;
  let selected=baseline;
  if(allow.energyMode!=='hybrid'&&charged.available&&(allow.energyMode==='manual'||charged.generalized<baseline.generalized))selected=charged;
  return {baseline,charged,selected,conditional:selected===charged&&allow.chargeState==='planned',savings:baseline.cash-selected.cash};
 }
 function estimate(params,allow){const e=energy(params,allow).selected;return {fuel:e.fuel,charge:e.charge,toll:allow.freeToll?0:allow.km*allow.highwayShare*params.tollRate,hotel:allow.hotelNights*params.hotel,food:params.food,tickets:allow.ticket,parking:allow.highwayShare===1?0:params.parking,other:params.other};}
 const sum=values=>Object.values(values).reduce((a,b)=>a+b,0);
 function date(start,index){if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return '';const d=new Date(start+'T00:00:00Z');if(!Number.isFinite(d.getTime()))return '';d.setUTCDate(d.getUTCDate()+index);return d.toISOString().slice(0,10);}
 return {categories,plans,defaults,distance,allowance,energy,estimate,sum,date};
})();
