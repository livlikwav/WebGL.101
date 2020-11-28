import React, {useState} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {GeoJsonLayer, PolygonLayer} from '@deck.gl/layers';
import {LightingEffect, AmbientLight, _SunLight as SunLight} from '@deck.gl/core';
//import {scaleThreshold} from 'd3-scale';
import {scaleSequential} from 'd3-scale';
//import {interpolateRainbow} from 'd3-scale-chromatic';
import {interpolateOrRd} from 'd3-scale-chromatic';
import {readString} from "react-papaparse";

// "MapboxAccessToken" 환경변수값
const MAPBOX_TOKEN = process.env.MapboxAccessToken; 

export const COLOR_SCALE = x =>
  // https://github.com/d3/d3-scale-chromatic
    (
      scaleSequential()
      .domain([0, 4])
//    .interpolator(interpolateRainbow)(x)
      .interpolator(interpolateOrRd)
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
      <div>총인구수: ${object.properties.population.total.toLocaleString()} 
        (남 ${object.properties.population.total_m.toLocaleString()} / 
        여 ${object.properties.population.total_f.toLocaleString()}) </div>
      <div>내국인수: ${object.properties.population.citizens.toLocaleString()} 
        (남 ${object.properties.population.citizens_m.toLocaleString()} / 
        여 ${object.properties.population.citizens_f.toLocaleString()}) </div>
      <div>외국인수: ${object.properties.population.foreigners.toLocaleString()} 
        (남 ${object.properties.population.foreigners_m.toLocaleString()} / 
        여 ${object.properties.population.foreigners_f.toLocaleString()}) </div>
      <div>총세대수: ${object.properties.population.households.toLocaleString()} </div>
      <div>세대당 인구: ${object.properties.population.per_household.toLocaleString()} </div>
      <div>고령자(65세 이상): ${object.properties.population.seniors.toLocaleString()} </div>
  `
    }
  );
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
      getElevation: f => f.properties.population.total * 0.05,
      getFillColor: f => COLOR_SCALE(f.properties.population.per_household),
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

    // 두 파일을 비동기적으로 읽기
    Promise.all([
      fetch(DATA_CSV).then(response => response.text()),
      fetch(DATA_JSON).then(response => response.json())
    ])
    .then(function(values) {

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

      // 서울특별시 데이터만 필터링
    let filtered_features = values[1].features.filter(f => f.properties.sidonm == "서울특별시");

    // 각 동마다 인구정보를 추가
    filtered_features.forEach( function(f, idx) {
      // 각 동이름에는 "서울특별시"와 "구명"이 포함되어 있으므로 이를 제거
      this[idx].properties.population = 
        dict_population[ f.properties.adm_nm.split(" ")[2] ];
    }, filtered_features);

    values[1].features = filtered_features;

    render(<App data={values[1]} />, container);
    });
}
