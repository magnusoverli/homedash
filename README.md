# HomeDash

A beautiful family dashboard for managing activities, schedules, and homework for your household. Track what everyone is up to during the week with an intuitive, week-by-week view.

![HomeDash](https://img.shields.io/badge/version-1.0.4-purple) ![Docker](https://img.shields.io/badge/docker-ready-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **📅 Weekly Calendar View** - See everyone's schedule at a glance
- **👨‍👩‍👧‍👦 Family Members** - Add up to 3 family members with custom colors and profile pictures
- **🏃 Activity Tracking** - Manage sports, lessons, appointments, and events
- **📚 Homework Management** - Track homework assignments with AI-powered assistance
- **🔄 Spond Integration** - Automatically sync activities from Spond groups (optional)
- **🎨 Beautiful UI** - Modern design with a carefully crafted color palette
- **🔐 Optional Access Control** - Password protect your dashboard if needed

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system
- Basic familiarity with command line

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/homedash.git
   cd homedash
   ```

2. **Start the application:**

   ```bash
   docker-compose up -d
   ```

3. **Access HomeDash:**

   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

That's it! HomeDash is now running on your machine.

## 🛠️ Configuration

### Environment Variables

HomeDash can be customized using environment variables in the `docker-compose.yml` file:

#### Timezone Configuration

Set your local timezone for accurate activity times:

```yaml
environment:
  - TZ=Europe/Oslo  # Change to your timezone (e.g., America/New_York, Asia/Tokyo)
```

#### Access Control (Optional)

Enable password protection for the UI:

```yaml
environment:
  - ACCESS_PASSWORD=your_secure_password_here  # Uncomment and set your password
```

When set, users will need to enter this password to access HomeDash.

### Port Configuration

By default, HomeDash uses:
- **Frontend**: Port 3000
- **Backend API**: Port 3001

To change the frontend port, edit `docker-compose.yml`:

```yaml
ports:
  - '8080:3000'  # Access on http://localhost:8080 instead
```

## 📱 Using HomeDash

### Adding Family Members

1. Click the **Settings** icon (⚙️) in the header
2. Click **Add Member**
3. Enter name, select a color, and optionally upload a profile picture
4. Click **Save**

### Managing Activities

**Add an Activity:**
1. Click the **+** button on a family member's card
2. Fill in the activity details (title, date, time)
3. Click **Save**

**Edit or Delete:**
- Click on any activity block to edit or delete it

### Homework Management

HomeDash includes AI-powered homework assistance:

1. **Add your Anthropic API key** in Settings (for Claude AI)
2. **Create homework entries** for family members
3. **Get AI help** with homework questions and explanations

> **Note:** An Anthropic API key is required for homework features. Get one at [console.anthropic.com](https://console.anthropic.com)

### Spond Integration (Advanced)

If your family uses Spond for sports team coordination:

1. Go to **Settings** → **Spond Integration**
2. Enter your Spond credentials
3. Map family members to their Spond profiles
4. Select which groups to sync
5. Activities from Spond will automatically appear on the dashboard

> **Important:** Spond integration uses an unofficial API and may break without notice. This is an optional feature.

## 🔧 Advanced Usage

### Viewing Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f homedash-backend
```

### Stopping the Application

```bash
docker-compose down
```

### Updating HomeDash

```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Backup Your Data

Your data is stored in a Docker volume. To backup:

```bash
# Find the volume name
docker volume ls | grep homedash

# Backup the volume
docker run --rm -v homedash_homedash-data:/data -v $(pwd):/backup alpine tar czf /backup/homedash-backup.tar.gz -C /data .
```

### Restore from Backup

```bash
# Restore the volume
docker run --rm -v homedash_homedash-data:/data -v $(pwd):/backup alpine tar xzf /backup/homedash-backup.tar.gz -C /data
```

## 🐛 Troubleshooting

### Application won't start

**Check if ports are available:**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Check if port 3001 is in use
lsof -i :3001
```

**View container status:**
```bash
docker-compose ps
```

### Can't connect to backend

**Check backend health:**
```bash
curl http://localhost:3001/api/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2024-03-15T10:30:00.000Z"}
```

### Activities show wrong times

Ensure your timezone is correctly set in `docker-compose.yml`:

```yaml
environment:
  - TZ=Europe/Oslo  # Your actual timezone
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Spond sync not working

1. **Verify credentials** in Settings
2. **Check backend logs:**
   ```bash
   docker-compose logs homedash-backend | grep -i spond
   ```
3. **Remember:** Spond API is unofficial and may change

## 📚 Architecture

HomeDash consists of:

- **Frontend** (React 19 + Vite) - Modern, responsive UI
- **Backend** (Express.js) - API proxy and data management
- **Database** (SQLite) - Persistent data storage
- **Docker** - Containerized deployment

All services run in Docker containers and communicate through an internal network.

## 🔒 Security Notes

- API keys are never stored on the server (passed through from frontend)
- Access control uses session-based tokens (cleared on restart)
- Data is stored locally in Docker volumes
- Optional password protection for UI access

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React, Express, and Docker
- UI design inspired by modern dashboard patterns
- Spond integration based on community reverse-engineering efforts

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the documentation in the repository

---

**Made with ❤️ for families**
