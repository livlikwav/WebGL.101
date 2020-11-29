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
// import {interpolateOranges} from 'd3-scale-chromatic';
import {interpolateBlues} from 'd3-scale-chromatic';
import {readString} from "react-papaparse";

// "MapboxAccessToken" 환경변수값
const MAPBOX_TOKEN = process.env.MapboxAccessToken; 

export const COLOR_SCALE = x =>
  // https://github.com/d3/d3-scale-chromatic
    (
      scaleSequential()
      .domain([0, 40]) // 차이값의 최대가 40000미만이므로
      .interpolator(interpolateBlues)
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
      <div>${object.properties.diff_str}<b>${object.properties.diff_val.toLocaleString()}</b> )</div>
      <div>생활인구(내국인): ${object.properties.real_population.citizens.toLocaleString()}</div>
      <div>주민등록인구(내국인): ${object.properties.population.citizens.toLocaleString()}</div>
      `
    }
    );
    // <div>|주민등록인구 - 생활인구| (내국인만): ${object.properties.diff_val.toLocaleString()}</div>
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
      getElevation: f => f.properties.diff_val * 0.1, // 0.1 -> polygon 높이 조절
      // getElevation: f => f.properties.population.total * 0.05, // 주민등록 인구수
      getFillColor: f => COLOR_SCALE(f.properties.diff_val / 1000), // 1000 -> 색 범위 조절
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

    const DATA_CSV = "stat_population_Seoul.txt"; // 주민등록인구 데이터
    const DATA_JSON = 'HangJeongDong_ver20200701.geojson'; // 행정동 geojson
    const NEW_DATA_JSON = 'stat_real_population_Seoul.json'; // 생활인구 데이터 (내국인)

    // 두 파일을 비동기적으로 읽기
    Promise.all([
      fetch(DATA_CSV).then(response => response.text()),
      fetch(DATA_JSON).then(response => response.json()),
      fetch(NEW_DATA_JSON).then(response => response.json())
    ])
    .then(function(values) {
      // value[0] = DATA_CSV
      // value[1] = DATA_JSON
      // value[2] = NEW DATA JSON
      // "tot_lvpop_co":"총생활인구수"
      // "adstrd_code_se":"행정동코드"

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
            // total:parseIntComma(row[4]),  // 총인구수
            // total_m:parseIntComma(row[5]),  // 남성인구수
            // total_f:parseIntComma(row[6]),  // 여성인구수
            citizens:parseIntComma(row[7]), // 총내국인수
            // citizens_m:parseIntComma(row[8]), // 남자내국인수
            // citizens_f:parseIntComma(row[9]), // 여자내국인수
            // foreigners:parseIntComma(row[10]), // 총외국인수
            // foreigners_m:parseIntComma(row[11]), // 남자외국인수
            // foreigners_f:parseIntComma(row[12]), // 여자외국인수
            // households:parseIntComma(row[3]), // 세대수
            // per_household:parseIntComma(row[13]), // 세대별 평균 인구수
            // seniors:parseIntComma(row[14]),  // 고령자(65세 이상)
          }
      }

      // 실 생활인구 데이터 전처리 (10자리 행정동코드를 key로 사용)
      let dict_real_population = {};
      for(const record of values[2].DATA){
        // geojson 데이터의 행정코드인 adm_nm2 10자리이다 ( 8자리 + 00)
        // 하지만, 실 생활인구 데이터의 행정코드 8자리이다.
        // 따라서 00을 붙여줌 (기본적으로 ""이므로 String으로 불러온다)
        let key = record.adstrd_code_se.concat('00');
        
        // tot_lvpop_co -> 총 생활인구 수
        // 실수 값이므로 정수로 치환 (소수점 버림)
        let total_num = parseInt(record.tot_lvpop_co);

        dict_real_population[key] = {
          citizens : total_num, //총 생활인구수 (내국인)
        }
      }
      
      
      // Geojson 데이터 기반으로 filtered_features를 만듬
      // 서울특별시 데이터만 필터링
      let filtered_features = values[1].features.filter(f => f.properties.sidonm == "서울특별시");
      
      // 각 동마다 인구정보를 추가
      filtered_features.forEach( function(f, idx) {
        // 주민등록인구 데이터 추가 (행정동 이름으로)
        // 각 동이름에는 "서울특별시"와 "구명"이 포함되어 있으므로 이를 제거
        this[idx].properties.population = 
        dict_population[ f.properties.adm_nm.split(" ")[2] ];

        // 주민등록인구 총내국인수 결측치 확인
        // if(!this[idx].properties.population.citizens){
        //   console.log('empty citizens');
          // citizens가 빈 값은 없다.
        // }

        // 실 생활인구 데이터 추가 (행정동코드 10자리를 기준으로)
        let new_data_value = dict_real_population[f.properties.adm_cd2];
        if(!new_data_value){
          console.log('adm_cd2 [' + f.properties.adm_cd2 + '] is Empty');
          // 결측치 처리 (주민등록 총 내국인 수로 채움)
          this[idx].properties.real_population = this[idx].properties.population;
        } else{
          this[idx].properties.real_population = new_data_value;
        }

        // 두 데이터간 차이값 계산
        let doc_total = this[idx].properties.population.citizens; // citizends -> 총 내국인수
        let real_total = this[idx].properties.real_population.citizens; // 총 내국인 생활인구 수
        if(doc_total < real_total){ // 219 개
          this[idx].properties.diff_val = real_total - doc_total;
          this[idx].properties.diff_str = '실 생활인구가 많음 ( +';
        } else{ // 206 개
          this[idx].properties.diff_val = doc_total - real_total;
          this[idx].properties.diff_str = '실 생활인구가 적음 ( -';
        }

    }, filtered_features);

    values[1].features = filtered_features;

    render(<App data={values[1]} />, container);
    });
}
