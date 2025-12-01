# SafeZone_WEB

<img width="200" height="450" alt="2" src="https://github.com/user-attachments/assets/495e37fc-94d2-480c-b3f9-22f369b431b7" />
<img width="200" height="450" alt="3" src="https://github.com/user-attachments/assets/fedcf96c-a59f-443d-804b-f12ac7629ce5" />

# 🐗 SafeZone Web (IoT Wildlife Monitoring System)

![React](https://img.shields.io/badge/React-19.1-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-HiveMQ-E31E24?style=flat-square&logo=mqtt&logoColor=white)

**SafeZone Web**은 농가나 보호 구역에 설치된 IoT 장치(스마트 말뚝)로부터 데이터를 수신하여 야생동물 출현을 **실시간으로 감지하고 모니터링**하는 웹 애플리케이션입니다.

MQTT 프로토콜을 이용해 장치의 상태와 배터리 정보를 실시간으로 수신하며, 움직임 감지 시 즉각적인 알림과 함께 현장 이미지를 확인할 수 있습니다.

---

## 📸 Screenshots

| 디바이스 리스트 (P1) | 지도 관제 및 알림 (P2) |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/495e37fc-94d2-480c-b3f9-22f369b431b7" width="250" /> | <img src="https://github.com/user-attachments/assets/fedcf96c-a59f-443d-804b-f12ac7629ce5" width="250" /> |

---

## 🏗 System Architecture

이 프로젝트는 클라이언트가 MQTT 브로커와 직접 통신하여 실시간성을 확보하고 Node.js 백엔드를 통해 데이터를 영구 저장하는 하이브리드 아키텍처를 사용합니다.

```mermaid
graph TD
    subgraph IoT Field
        Device[Smart Stake Device]
        CCTV[CCTV Camera]
    end

    subgraph Cloud/Broker
        MQTT[(HiveMQ Broker)]
    end

    subgraph User Interface
        React[React Web App]
        P1[Page 1: List & Management]
        P2[Page 2: Map & Control]
    end

    subgraph Backend System
        Node[Node.js API Server]
        DB[(PostgreSQL)]
    end

    Device -->|Publish Status/Alert| MQTT
    MQTT -->|Subscribe (Notify)| React
    React -->|HTTP POST (Save Log)| Node
    Node -->|INSERT| DB
    React -->|HTTP GET (Fetch History)| Node
    Node -->|SELECT| DB
    React -->|Publish Control (PTZ)| MQTT
    MQTT -->|Subscribe Command| Device
    CCTV -.->|MJPEG Stream| P2

