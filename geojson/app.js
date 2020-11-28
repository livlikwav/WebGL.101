import React, {useState} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {GeoJsonLayer, PolygonLayer} from '@deck.gl/layers';
import {LightingEffect, AmbientLight, _SunLight as SunLight} from '@deck.gl/core';
//import {scaleThreshold} from 'd3-scale';
import {scaleSequential} from 'd3-scale';
//import {interpolateRainbow} from 'd3-scale-chromatic';
// import {interpolateOrRd} from 'd3-scale-chromatic';
import {interpolateOranges} from 'd3-scale-chromatic';
import {readString} from "react-papaparse";

// "MapboxAccessToken" 환경변수값
const MAPBOX_TOKEN = process.env.MapboxAccessToken; 

export const COLOR_SCALE = x =>
  // https://github.com/d3/d3-scale-chromatic
    (
      scaleSequential()
      .domain([0, 100])
      // .domain([0, 4])
//    .interpolator(interpolateRainbow)(x)
      .interpolator(interpolateOranges)
    )(x) // return a string color "rgb(R,G,B)"
    .slice(4,-1)  // extract "R,G,B"
    .split(',') // spline into an array ["R", "G", "B"]
    .map(x => parseInt(x,10));  // convert to [R, G, B]


const INITIAL_VIEW_STATE = {
  // 서울시청 좌표
  latitude: 37.5663,
  longitude: 126.9779,
  zoom: 11,
  maxZoom: 16,
  pitch: 45,
  bearing: 0
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const dirLight = new SunLight({
  timestamp: Date.UTC(2019, 7, 1, 22),
  color: [255, 255, 255],
  intensity: 1.0,
//  _shadow: true
  _shadow: false
});

function getTooltip({object}) {
  return (
    object && {
      html: `\
      <div><b>${object.properties.adm_nm}</b></div>
      <div>${object.properties.diff_str}</div>
      <div>|주민등록인구 - 생활인구|: ${object.properties.diff_val.toLocaleString()}</div>
      <div>(주민등록인구)총인구수: ${object.properties.population.total.toLocaleString()}</div>
      <div>(생활인구)총생활인구수: ${object.properties.real_population.total.toLocaleString()}</div>
      <div>(주민등록인구)총내국인수: ${object.properties.population.citizens.toLocaleString()}</div>
      <div>(주민등록인구)총외국인수: ${object.properties.population.foreigners.toLocaleString()}</div>
      <div>(주민등록인구)세대당 인구: ${object.properties.population.per_household.toLocaleString()}</div>
  `
    }
  );
  // return (
  //   object && {
  //     html: `\
  //     <div><b>${object.properties.adm_nm}</b></div>
  //     <div>총인구수: ${object.properties.population.total.toLocaleString()} 
  //       (남 ${object.properties.population.total_m.toLocaleString()} / 
  //       여 ${object.properties.population.total_f.toLocaleString()}) </div>
  //     <div>내국인수: ${object.properties.population.citizens.toLocaleString()} 
  //       (남 ${object.properties.population.citizens_m.toLocaleString()} / 
  //       여 ${object.properties.population.citizens_f.toLocaleString()}) </div>
  //     <div>외국인수: ${object.properties.population.foreigners.toLocaleString()} 
  //       (남 ${object.properties.population.foreigners_m.toLocaleString()} / 
  //       여 ${object.properties.population.foreigners_f.toLocaleString()}) </div>
  //     <div>총세대수: ${object.properties.population.households.toLocaleString()} </div>
  //     <div>세대당 인구: ${object.properties.population.per_household.toLocaleString()} </div>
  //     <div>고령자(65세 이상): ${object.properties.population.seniors.toLocaleString()} </div>
  // `
  //   }
  // );
}

export default function App({data = DATA_URL, mapStyle = 'mapbox://styles/mapbox/light-v9'}) {

  const [effects] = useState(() => {
    const lightingEffect = new LightingEffect({ambientLight, dirLight});
    lightingEffect.shadowColor = [0, 0, 0, 0.5];
    return [lightingEffect];
  });

  const layers = [
    // only needed when using shadows - a plane for shadows to drop on
  /*
    new PolygonLayer({
      id: 'ground',
      data: landCover,
      stroked: false,
      getPolygon: f => f,
      getFillColor: [0, 0, 0, 0]
    }),
    */

    // reference: https://deck.gl/docs/api-reference/layers/geojson-layer
    new GeoJsonLayer({
      id: 'population',
      data,
      opacity: 0.9,
      stroked: false,
      filled: true,
      extruded: true,
      wireframe: true,
      getElevation: f => f.properties.diff_val * 0.1, // 차이로 하고 있음
      // getElevation: f => f.properties.real_population.total * 0.05, // 생활 인구수로 하고 있음
      // getElevation: f => f.properties.population.total * 0.05, // 주민등록 인구수로 하고 있음
      getFillColor: f => COLOR_SCALE(f.properties.real_population.total / 1000),
      // getFillColor: f => COLOR_SCALE(f.properties.population.per_household),
      getLineColor: [255, 255, 255],
      pickable: true
    })
  ];

  return (
    <DeckGL
      layers={layers}
      effects={effects}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={getTooltip}
    >
      <StaticMap
        reuseMaps
        mapStyle={mapStyle}
        preventStyleDiffing={true}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      />
    </DeckGL>
  );
}

export function renderToDOM(container) {

    const DATA_CSV = "stat_population_Seoul.txt";
    const DATA_JSON = 'HangJeongDong_ver20200701.geojson';
    const NEW_DATA_JSON = 'stat_real_population_Seoul.json';

    // 두 파일을 비동기적으로 읽기
    Promise.all([
      fetch(DATA_CSV).then(response => response.text()),
      fetch(DATA_JSON).then(response => response.json()),
      fetch(NEW_DATA_JSON).then(response => response.json())
    ])
    .then(function(values) {
      // value[2] = NEW DATA JSON
      // "TOT_LVPOP_CO":"총생활인구수"
      // "ADSTRD_CODE_SE":"행정동코드"
      // 두개다 데이터에는 소문자로 되어 있음
      // 문제는 행정동 별로 없는 값이 있음!!! 

      // parse the CVS file using papaparse library function
      const result = readString(values[0]); 

      // A helper function to parse numbers with thousand separator
      const parseIntComma = s => parseFloat(s.split(",").join(""));

      // Build population dictionary (동이름을 key로 사용)
      let dict_population = {};
      for(const row of result.data) {
          // 두 데이터의 동이름을 같게 하기 위해 인구데이터의 동이름에 포함된 "."를 모두 "·"로 치환
          let key = row[2].replaceAll(".","·"); 

          dict_population[key] = {
            total:parseIntComma(row[4]),  // 총인구수
            total_m:parseIntComma(row[5]),  // 남성인구수
            total_f:parseIntComma(row[6]),  // 여성인구수
            citizens:parseIntComma(row[7]), // 총내국인수
            citizens_m:parseIntComma(row[8]), // 남자내국인수
            citizens_f:parseIntComma(row[9]), // 여자내국인수
            foreigners:parseIntComma(row[10]), // 총외국인수
            foreigners_m:parseIntComma(row[11]), // 남자외국인수
            foreigners_f:parseIntComma(row[12]), // 여자외국인수
            households:parseIntComma(row[3]), // 세대수
            per_household:parseIntComma(row[13]), // 세대별 평균 인구수
            seniors:parseIntComma(row[14]),  // 고령자(65세 이상)
          }
      }

      let dict_real_population = {};
      for(const record of values[2].DATA){
        // geojson 행정코드 adm_nm2 10자리 ( 8자리 + 00)
        // real_population 행정코드 8자리
        // 그러므로 00을 붙여줌 (기본적으로 ""이므로 String으로 불러온다)
        let key = record.adstrd_code_se.concat('00');
        // 제대로 key 10자리로 바꾸는건 확인함
        // console.log(key);
        
        // total_num을 소수점 이하를 없애주기
        let total_num = parseInt(record.tot_lvpop_co);
        // dict를 key 기준으로 넣어주기
        dict_real_population[key] = {
          total:total_num, //총 생활인구수
        }
        // total_num 제대로 찍히는건 확인함!
        // console.log(total_num);
        // 확인 완료
        // console.log(total_num + ' ----- ' + dict_real_population[key].total);
      }
      
      
      // Geojson 데이터 기반으로 filtered_features를 만듬
      // 서울특별시 데이터만 필터링
      let filtered_features = values[1].features.filter(f => f.properties.sidonm == "서울특별시");
      
      // 각 동마다 인구정보를 추가
      // Geojson의 properties에 그냥 population 필드로 추가해버림
      // Geojson의 위치정보는 properties가 아닌 geometry에 있음
      filtered_features.forEach( function(f, idx) {
        // 각 동이름에는 "서울특별시"와 "구명"이 포함되어 있으므로 이를 제거
        this[idx].properties.population = 
        dict_population[ f.properties.adm_nm.split(" ")[2] ];
        // 행정동코드를 비교하여 real_population 값도 추가해야함
        // geojson 행정코드 adm_nm2 10자리 ( 8자리 + 00)
        // 따라서 그대로 호출하면 됨
        this[idx].properties.real_population = dict_real_population[f.properties.adm_cd2];
        // 확인 완료
        // console.log(f.properties.adm_cd2);
        // 확인 완료
        // {total: 32320}
        // console.log(dict_real_population[f.properties.adm_cd2]);
        // 확인 완료
        // {total: 32320}
        // console.log(this[idx].properties.real_population);
        
        // 혹시나 dict_real_population이 없는지 확인해야함
        if(!dict_real_population[f.properties.adm_cd2]){
          console.log(f.properties.adm_cd2 + ' is Empty');
          // 주민등록인구 수로 채움
          this[idx].properties.real_population = dict_population[ f.properties.adm_nm.split(" ")[2] ];
        }

        // 차이값 -인지 확인해보기
        let doc_total = this[idx].properties.population.total;
        let real_total = this[idx].properties.real_population.total;
        if(doc_total < real_total){
          // console.log('real is big');
          // 219 개
          // console.log(doc_total + ' ' + real_total);
          this[idx].properties.diff_val = real_total - doc_total;
          this[idx].properties.diff_str = '실 생활인구가 적음';
        } else{
          this[idx].properties.diff_val = doc_total - real_total;
          this[idx].properties.diff_str = '실 생활인구가 많음';
          
          // console.log('real is small');
          // 206 개
        }

    }, filtered_features);

    // Geojson 데이터의 feature에 
    values[1].features = filtered_features;

    render(<App data={values[1]} />, container);
    });
}
