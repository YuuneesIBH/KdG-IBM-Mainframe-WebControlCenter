# KdG Mainframe Web Control Center

> Modernizing IBM Z operations through intuitive web-based interfaces

**Academic Year 2024-2025**  
**Author:** Younes El Azzouzi  
**Program:** Applied Computer Science  
**Institution:** Karel de Grote University of Applied Sciences and Arts

## Overview

KdG Mainframe Web Control Center represents a paradigm shift in mainframe interaction, delivering a sophisticated web-based management interface for IBM Z systems. Built entirely within Unix System Services (USS), the platform enables seamless interaction with datasets, PDS members, JCL jobs, REXX scripts, and USS processes through modern web browsers—completely bypassing traditional ISPF workflows.

By synthesizing Python Flask, Zowe CLI, USS shell scripting, and established mainframe paradigms into a cohesive platform, this project accelerates workflows, enhances accessibility, and future-proofs mainframe operations.

---

## The Challenge

Traditional mainframe interfaces, while powerful, face significant adoption barriers:

**For New Users**
- Steep learning curves discourage student engagement
- Non-intuitive command structures impede rapid onboarding
- Outdated visual paradigms feel disconnected from contemporary development environments

**For Development Teams**
- Multi-step workflows slow iterative development cycles
- Context switching between tools reduces productivity
- Limited integration with modern DevOps practices

**For Organizations**
- Extended training periods increase operational costs
- Talent acquisition challenges due to perceived technology obsolescence
- Growing gap between legacy systems and modern development practices

As enterprises pursue mainframe modernization initiatives, the demand for accessible yet powerful tooling has never been more critical.

---

## Solution

KdG Mainframe Web Control Center bridges the mainframe accessibility gap by delivering enterprise-grade functionality through an intuitive web interface. The platform maintains full compatibility with existing IBM Z infrastructure while providing the user experience standards expected in modern development environments.

**Design Principles**

*Accessibility First*  
Interface design prioritizes clarity and discoverability, enabling new users to become productive within minutes rather than weeks.

*Performance Optimized*  
Streamlined workflows reduce common operations from multiple steps to single interactions, dramatically improving developer velocity.

*Security Native*  
Deep integration with IBM Z security frameworks ensures all operations respect existing access controls and audit requirements.

*Future Compatible*  
Modern technology stack ensures long-term viability while maintaining full backward compatibility with traditional mainframe operations.

---

## Feature Set

### Dataset Explorer

Navigate the complete dataset landscape through an intuitive browser-based interface.

**Capabilities**
- Hierarchical browsing of High-Level Qualifiers
- Real-time dataset discovery and filtering
- PDS member enumeration and selection
- Comprehensive metadata display including record format, block size, and allocation details

Data flows seamlessly from Zowe CLI through Flask processing to responsive UI rendering.

### Advanced Member Editor

Professional-grade editing experience with mainframe-specific enhancements.

**Editor Features**
- Context-aware syntax highlighting for JCL, REXX, COBOL, and assembler
- Direct save operations with automatic member updates
- Member lifecycle management including creation, renaming, and deletion
- Optional change tracking and diff visualization
- Configurable editor preferences and keybindings

### Script Execution Engine

Execute REXX and Python scripts directly from the web interface with real-time feedback.

**Execution Workflow**
1. Select script from library or upload new script
2. Configure execution parameters through web form
3. Submit for execution with single-click deployment
4. Monitor real-time console output with timestamped logging
5. Review execution results and performance metrics

**Applications**
- Automated dataset processing and validation
- Custom utility development and testing
- Rapid prototyping of mainframe automation
- Educational demonstrations and training exercises

### JCL Job Submission Center

Comprehensive job submission and monitoring replacing traditional SDSF workflows.

**Submission Process**
- Select JCL from member library or paste directly into editor
- Automatic temporary dataset provisioning
- Job submission via Zowe CLI with immediate job ID allocation
- Real-time job status tracking

**Output Visualization**
- JESMSGLG system messages
- JESJCL submitted JCL echo
- JESYSMSG JES2 processing messages
- All SYSOUT DD allocations
- Detailed return code analysis
- Condition code interpretation and troubleshooting guidance

Delivers SDSF-equivalent functionality within an accessible browser environment.

### USS Integration Suite

Full-featured Unix System Services management capabilities.

**File Operations**
- Hierarchical directory navigation
- File viewing with syntax-aware rendering
- Bidirectional file transfer between workstation and USS
- Permission and ownership management

**Script Management**
- Shell script editing and execution
- Live output streaming with ANSI color support
- Error highlighting and diagnostic information
- Process monitoring and control

Demonstrates the powerful synergy between open-source USS tooling and traditional mainframe workloads.

### Operational Dashboard

Centralized command center providing situational awareness and rapid access.

**Dashboard Components**

*System Health*
- CPU utilization trends
- System uptime metrics
- USS filesystem capacity monitoring
- Active user sessions

*Recent Activity*
- Latest job submissions with status
- Recently modified members with change tracking
- Scheduled task status
- System notifications and alerts

*Quick Actions*
- Frequently accessed datasets
- Saved JCL templates
- Common utility scripts
- Customizable shortcuts

Provides production-quality operational visibility comparable to enterprise monitoring solutions.

---

## Technical Architecture

### Three-Tier Design

**Presentation Layer**
- Responsive HTML5/CSS3 with Bootstrap framework
- Dynamic JavaScript interfaces leveraging modern ES6+ features
- Asynchronous communication via Fetch API
- Progressive enhancement for optimal performance across connection speeds

**Application Layer**
- Python 3 Flask application hosted on USS
- RESTful API architecture with comprehensive endpoint coverage
- Subprocess orchestration for Zowe CLI integration
- JSON-based data interchange formats
- Robust error handling and logging infrastructure

**Integration Layer**
- Zowe CLI providing standardized mainframe API access
- TSO/E session management for interactive operations
- JES2 integration for job submission and spool access
- DFSMS dataset operations respecting security controls
- USS runtime environment for application hosting

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/datasets` | GET | List datasets matching HLQ pattern |
| `/api/datasets/{dsn}/members` | GET | Enumerate PDS members |
| `/api/members/{dsn}/{member}` | GET | Retrieve member content |
| `/api/members/{dsn}/{member}` | PUT | Update member content |
| `/api/members/{dsn}/{member}` | DELETE | Remove member |
| `/api/jobs/submit` | POST | Submit JCL for execution |
| `/api/jobs/{jobid}` | GET | Retrieve job status |
| `/api/jobs/{jobid}/output` | GET | Fetch job spool output |
| `/api/scripts/execute` | POST | Execute REXX/Python script |
| `/api/uss/browse` | GET | List USS directory contents |
| `/api/uss/file` | GET/PUT | Read/write USS files |

### Data Flow

```
Browser → HTTPS → Flask Application → Zowe CLI → z/OS APIs → Datasets/Jobs/USS
                                                              ↓
Browser ← JSON ← Flask Processing ← JSON Response ← Zowe CLI Results
```

This architecture delivers modern DevOps capabilities while maintaining complete compatibility with established mainframe security and operational models.

---

## Value Proposition

### Operational Transformation

**Modernized Access Patterns**  
Transitions from character-based 3270 terminals to contemporary web interfaces, eliminating the primary barrier to mainframe adoption for new developers.

**Accelerated Onboarding**  
Reduces time-to-productivity from weeks to hours through intuitive design and familiar interaction patterns, significantly lowering training costs.

**Enhanced Development Velocity**  
Streamlines edit-test-debug cycles by eliminating context switching and multi-step workflows, enabling rapid iteration comparable to modern IDE experiences.

**Real Industry Impact**  
Addresses documented challenges in mainframe skill acquisition and retention, directly supporting organizational mainframe modernization initiatives.

### Technical Innovation

**Hybrid Architecture Excellence**  
Demonstrates seamless integration of contemporary web technologies (Python, Flask, REST APIs) with mature mainframe platforms, proving modernization without migration.

**Open Standards Integration**  
Leverages Zowe's vendor-neutral APIs, ensuring portability and avoiding vendor lock-in while maintaining enterprise-grade reliability.

**Extensibility Framework**  
Modular architecture enables rapid feature development and custom integration, supporting unique organizational requirements.

### Demonstration Value

Complete workflow demonstration achievable in under 60 seconds:

1. Authenticate via web interface
2. Browse dataset catalog
3. Open PDS member in editor
4. Modify JCL with syntax highlighting
5. Submit job with single click
6. View real-time spool output
7. Analyze return codes

This rapid demonstration effectively communicates platform capabilities to both technical and executive audiences.

---

## Deployment Requirements

### Infrastructure Prerequisites

**IBM Z Environment**
- z/OS 2.3 or higher
- Unix System Services (USS) with adequate filesystem allocation
- Network connectivity for HTTP/HTTPS services
- TSO/E user IDs with appropriate RACF/ACF2/Top Secret permissions

**Software Dependencies**
- Python 3.8 or higher with pip package manager
- Zowe CLI 7.0 or higher with appropriate plugins
- Node.js 14+ (for Zowe CLI installation)
- Web server capability (Flask development server or production WSGI server)

**Security Requirements**
- SSL/TLS certificates for production deployment
- Integration with existing authentication infrastructure
- Audit logging configuration
- Firewall rules permitting web traffic to designated ports

### Installation Overview

Detailed installation procedures are environment-specific and should be coordinated with system administrators to ensure compliance with organizational security policies and operational standards.

General deployment workflow:

1. Provision USS directory structure
2. Install Python dependencies via pip
3. Configure Zowe CLI profiles and authentication
4. Deploy Flask application code
5. Configure web server (development or production)
6. Validate security integration
7. Perform user acceptance testing

Comprehensive installation documentation available upon request.

---

## Security Model

### Authentication & Authorization

The platform integrates natively with IBM Z security subsystems, ensuring all operations execute under authenticated user credentials with appropriate permission validation.

**Security Features**
- Integration with RACF, ACF2, or Top Secret
- SAF (System Authorization Facility) permission checking for all dataset operations
- Audit trail generation for compliance requirements
- Session management with configurable timeout policies
- HTTPS encryption for data in transit

### Access Control

All dataset access, job submission, and USS operations respect existing mainframe security definitions. Users cannot access resources beyond their established permissions, maintaining the security posture of traditional mainframe access methods.

---

## Target Audience

**Academic Institutions**  
Universities and technical colleges teaching mainframe technologies to computer science and information systems students.

**Enterprise IT Organizations**  
Companies operating IBM Z systems seeking to modernize workflows and reduce training overhead for development teams.

**Mainframe Service Providers**  
Organizations providing mainframe services requiring accessible tools for client interaction and support.

**Training Organizations**  
Professional development companies delivering mainframe education and certification programs.

---

## Roadmap

### Planned Enhancements

**Advanced Search Capabilities**  
Full-text search across datasets and members with regex support and customizable filters.

**Collaborative Features**  
Multi-user editing with conflict resolution, shared workspaces, and team activity feeds.

**Extended Monitoring**  
Performance analytics dashboards, capacity trending, and predictive alerting.

**API Extensions**  
Documented REST APIs for custom integrations and third-party tool connectivity.

**Plugin Architecture**  
Framework for custom extensions and organization-specific functionality.

**Mobile Optimization**  
Responsive design enhancements for tablet and smartphone access.

---

## Contribution & Support

**Project Information**
- **Developer:** Younes El Azzouzi
- **Academic Year:** 2024-2025
- **Program:** Applied Computer Science
- **Institution:** Karel de Grote University of Applied Sciences and Arts

This project is developed as part of mainframe education modernization initiatives at KdG.

For inquiries regarding deployment, customization, or collaboration opportunities, please contact the project team through official KdG channels.

---

## License

Project licensing and usage terms to be determined in consultation with KdG administration and potential deployment partners.

---

## Acknowledgments

This project builds upon the exceptional work of the Zowe community and leverages the robust IBM Z platform. Special recognition to the students, faculty, and industry partners contributing to mainframe education advancement.

---

*Building bridges between heritage and innovation*