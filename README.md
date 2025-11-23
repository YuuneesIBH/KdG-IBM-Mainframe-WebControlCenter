# KdG Mainframe Web Control Center

![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.0+-000000?style=flat-square&logo=flask&logoColor=white)
![IBM Z](https://img.shields.io/badge/IBM%20Z-z/OS-0530AD?style=flat-square&logo=ibm&logoColor=white)
![Zowe](https://img.shields.io/badge/Zowe-CLI-00B4E6?style=flat-square)

**Web-based interface voor IBM Z mainframe operaties**

Academiejaar 2025-2026 | Karel de Grote Hogeschool  
Student: Younes El Azzouzi | Applied Computer Science

---

## Overzicht

Dit project is ontwikkeld als onderdeel van het mainframe curriculum aan Karel de Grote Hogeschool. Het biedt een moderne webinterface voor het beheren van IBM Z mainframe systemen, waardoor studenten en developers eenvoudiger kunnen werken met datasets, jobs, en USS files zonder de traditionele 3270 terminal.

### Waarom dit project?

Traditionele mainframe interfaces hebben een steile leercurve. Deze webapplicatie maakt mainframe operaties toegankelijker door:
- Een vertrouwde browser-gebaseerde interface te bieden
- Veel gebruikte workflows te vereenvoudigen
- Real-time feedback en monitoring te ondersteunen
- Studenten sneller productief te laten zijn

## Features

### Dataset Management
- Browsing van datasets met HLQ filtering
- PDS member weergave en navigatie
- Dataset informatie en metadata

### Code Editor
- Syntax highlighting voor JCL, REXX, COBOL
- Auto-save functionaliteit (elke 30 seconden)
- Line numbering en word wrap
- Keyboard shortcuts (Ctrl+S, Ctrl+N)
- Direct opslaan naar mainframe

### Job Management
- Job lijst weergave met filters (owner, prefix, status)
- Job details en spool files bekijken
- Real-time job monitoring
- Job purge functionaliteit
- Return code analyse

### USS Integration
- Directory browsing
- File editor
- File upload/download
- Directory aanmaken
- Permission management

### Activity Dashboard
- System statistieken (datasets, jobs, USS files)
- Recent activity feed
- Job synchronization met mainframe

## Technische Stack

**Backend**
- Python 3.8+ met Flask framework
- Zowe CLI voor mainframe communicatie
- JSON voor data uitwisseling

**Frontend**
- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5 voor UI components
- Fetch API voor async calls

**Mainframe**
- IBM z/OS 2.3+
- USS (Unix System Services)
- Zowe CLI 7.0+

## Architectuur

```
Browser → Flask (Python) → Zowe CLI → z/OS APIs → Datasets/Jobs/USS
```

De applicatie draait volledig op USS en gebruikt Zowe CLI als brug naar de mainframe services.

## Prerequisites

- IBM z/OS 2.3 of hoger
- Python 3.8+ met pip
- Node.js 14+ (voor Zowe CLI)
- Zowe CLI 7.0+ met plugins
- TSO user ID met juiste permissions
- USS toegang

## Installatie

### 1. Clone het project

```bash
cd /u/[your-userid]
git clone https://github.com/yourusername/kdg-mainframe-control-center.git
cd kdg-mainframe-control-center
```

### 2. Installeer Python dependencies

```bash
pip3 install -r requirements.txt
```

**requirements.txt:**
```
Flask==2.3.0
python-dotenv==1.0.0
```

### 3. Installeer Zowe CLI

```bash
npm install -g @zowe/cli@latest
zowe plugins install @zowe/zos-files-for-zowe-cli@latest
zowe plugins install @zowe/zos-jobs-for-zowe-cli@latest
```

### 4. Configureer Zowe profile

```bash
zowe profiles create zosmf-profile [profile-name] \
  --host [mainframe-host] \
  --port [port] \
  --user [userid] \
  --password [password] \
  --reject-unauthorized false
```

### 5. Maak .env file

```bash
cp .env.example .env
```

Bewerk `.env`:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
MOCK_MODE=False
ZOS_HOST=your-mainframe-host
ZOS_PORT=443
ZOS_USER=YOURUSR
ZOWE_PROFILE=default
```

### 6. Start de applicatie

```bash
python3 app.py
```

De applicatie is beschikbaar op `http://localhost:6767`

## Configuratie

### Development Mode (met mock data)

```python
# In .env
MOCK_MODE=True
```

Dit gebruikt mock data voor development zonder echte mainframe connectie.

### Production Mode

```python
# In .env
MOCK_MODE=False
FLASK_ENV=production
```

Dit maakt echte connecties met de mainframe.

## API Endpoints

| Endpoint | Method | Beschrijving |
|----------|--------|--------------|
| `/api/health` | GET | Health check |
| `/api/dashboard` | GET | Dashboard statistieken |
| `/api/activities` | GET | Recent activity feed |
| `/api/datasets/list` | GET | Lijst datasets |
| `/api/datasets/members` | GET | Lijst PDS members |
| `/api/datasets/content` | GET | Member content ophalen |
| `/api/datasets/save` | POST | Member opslaan |
| `/api/jobs` | GET | Lijst jobs |
| `/api/jobs/{jobid}` | GET | Job details |
| `/api/jobs/{jobid}` | DELETE | Job purgen |
| `/api/jobs/{jobid}/spool/{id}` | GET | Spool content |
| `/api/uss/browse` | GET | USS directory listing |
| `/api/uss/file` | GET/PUT/DELETE | USS file operaties |
| `/api/uss/directory` | POST | USS directory aanmaken |

Zie de [API documentatie](docs/API.md) voor details.

## Security

De applicatie integreert met bestaande mainframe security:

- **Authenticatie**: Via Zowe CLI profiles met TSO credentials
- **Autorisatie**: RACF/ACF2/Top Secret permissions worden gerespecteerd
- **Audit**: Alle operaties worden gelogd
- **Encryptie**: HTTPS wordt aanbevolen voor productie

Alle dataset access, job submission en USS operaties gebeuren onder de credentials van de ingelogde user.

## Project Structuur

```
kdg-mainframe-control-center/
├── app.py                 # Flask applicatie entry point
├── routes.py              # API routes en endpoints
├── config.py              # Configuratie classes
├── activity_logger.py     # Activity logging systeem
├── activity_sync.py       # Mainframe job synchronization
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variabelen template
├── static/
│   ├── css/              # Stylesheets
│   └── js/
│       ├── datasets.js   # Dataset management
│       ├── editor.js     # Code editor
│       ├── jobs.js       # Job management
│       └── uss.js        # USS operations
├── templates/
│   ├── base.html         # Base template
│   ├── index.html        # Dashboard
│   ├── datasets.html     # Dataset browser
│   ├── editor.html       # Code editor
│   ├── jobs.html         # Job manager
│   └── uss.html          # USS browser
└── README.md
```

## Development

### Code Style

- Python: PEP 8
- JavaScript: ES6+ met consistent formatting
- HTML/CSS: Proper indentation, semantic HTML

### Testing

Voor development kan je de mock mode gebruiken:

```bash
# In .env
MOCK_MODE=True
```

Dit test de interface zonder mainframe connectie.

## Roadmap

### Huidige versie (v1.0)
- ✅ Dataset browsing en editing
- ✅ Job submission en monitoring
- ✅ USS file management
- ✅ Activity logging
- ✅ Auto-save in editor

### Toekomstige versies
- [ ] Advanced search functionaliteit
- [ ] Batch operaties
- [ ] Job submission via editor
- [ ] Syntax validation
- [ ] Dark mode
- [ ] User preferences
- [ ] Export functionaliteit

## FAQ

**Q: Kan ik dit gebruiken zonder mainframe toegang?**  
A: Ja, zet `MOCK_MODE=True` in de .env file voor development met mock data.

**Q: Welke browsers worden ondersteund?**  
A: Chrome, Firefox, Safari, Edge (laatste 2 versies).

**Q: Hoe vaak wordt de activity feed bijgewerkt?**  
A: De activity feed wordt real-time bijgewerkt bij elke actie. Job sync gebeurt handmatig of automatisch.

**Q: Kan ik meerdere datasets tegelijk bewerken?**  
A: Momenteel niet, maar dit staat op de roadmap.

## Contributing

Dit is een academisch project ontwikkeld aan KdG. Voor vragen of suggesties:

1. Open een issue op GitHub
2. Contact via [younes.elazzouzi@student.kdg.be](mailto:younes.elazzouzi@student.kdg.be)

## License

Dit project is ontwikkeld voor educatieve doeleinden aan Karel de Grote Hogeschool. Licentie voorwaarden worden nog bepaald in overleg met de hogeschool.

## Acknowledgments

**Ontwikkeld door**  
Younes El Azzouzi  
Applied Computer Science  
Karel de Grote Hogeschool  
Academiejaar 2025-2026

**Met dank aan**
- De Zowe community voor de CLI tooling
- IBM voor het Z platform
- KdG docenten voor begeleiding en support
- Medestudenten voor feedback en testing

**Technologieën**
- [Flask](https://flask.palletsprojects.com/) - Python web framework
- [Zowe CLI](https://www.zowe.org/) - z/OS command line interface
- [Bootstrap](https://getbootstrap.com/) - UI framework
- [Bootstrap Icons](https://icons.getbootstrap.com/) - Icon library

## Contact

**Student**: Younes El Azzouzi  
**Opleiding**: Applied Computer Science  
**Instelling**: Karel de Grote Hogeschool  
**Academiejaar**: 2025-2026  
**Email**: younes.elazzouzi@student.kdg.be

---

*Mainframe modernization project - KdG Hogeschool*