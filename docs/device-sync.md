Device Sync via Nextcloud CalDAV

Overview

- Nextcloud provides CalDAV endpoints that native device clients can use.
- This project writes events to Nextcloud; your devices sync automatically.

Setup

1) Install Nextcloud and enable Calendar app.
2) Create a user for the assistant and/or personal user.
3) Get CalDAV URL: https://YOUR_NEXTCLOUD/remote.php/dav/calendars/USERNAME/
4) Use app passwords for clients.

Clients

- iOS: Settings > Calendar > Accounts > Add CalDAV Account
- Android: Install DAVx⁵, add CalDAV account
- macOS: Calendar > Accounts > Add CalDAV Account
- Windows: Use Thunderbird + Lightning
- Smartwatch: Sync depends on phone OS; typically mirrors phone calendar

Permissions

- Share calendars in Nextcloud to control read/write access for assistant user.

