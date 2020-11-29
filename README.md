# WebGL.101

University of Seoul, 'Computer graphics' class, in 2020 second semester.  
Assignment 2 : 도시 공공데이터 시각화

- geojson project
  - 서울시 행정동별 주민등록인구와 생활인구 통계 차이값 시각화
- hexagon project
  - 서울시 소방대상물 위치 기반 시각화

![geojson](https://user-images.githubusercontent.com/44190293/100538156-4ed1d600-3271-11eb-8a09-49d1968e7371.png)

![hexagon](https://user-images.githubusercontent.com/44190293/100538224-ba1ba800-3271-11eb-8836-87063a46908c.png)

## Tech stack

- deck.gl
- Mapbox API
- React
- NPM
- webpack

## Reference

I use ...

- [https://deck.gl/examples/geojson-layer-polygons](https://deck.gl/examples/geojson-layer-polygons)
- [https://deck.gl/examples/hexagon-layer](https://deck.gl/examples/hexagon-layer)

## What is this course about?

- To understand real-time 3D rendering techniques.
  - Closely related to the modern GPU (Graphics Processing Units) architecture
- To learn three.js for developing 3D interactive applications.
- To learn WebGL 2.0 for developing 3D interactive applications.
- To understand modern graphics hardware architecture.
  - 3D graphics pipeline
  - How GPUs work
- To learn latest graphics technology
  - Even lower level 3D graphics APIs: Vulkan, Metal, WebGPU, etc.
  - Latest graphics architectures: NVIDIA RTX platform, etc.

## Getting Started

### 주의할 점

geojson 폴더 내의 data 파일이 너무 커서 push가 불가능했습니다.

- stat_real_population_Seoul.csv
- stat_real_population_Seoul.json

따라서 202010 행정동별 생활인구 내국인 데이터 json을 직접 다운받으셔야 합니다.
