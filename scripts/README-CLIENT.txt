# Cloth n Care - Client Setup

Thank you for using Cloth n Care! This folder contains everything needed to run
the app on one computer and use it from any device on the same network.

## Requirements

- A Windows 10/11 computer that stays switched on while you work
- Nothing to install! Java is bundled inside the `jre` folder in this package.

## First-time setup (do once)

1. Copy this whole folder to the computer that will run the app
   (for example to C:\ClothNCare).
2. Double-click `start.bat`.

## Daily use

1. Double-click `start.bat` and wait for the line
   `Cloth n Care` to finish starting (a few seconds).
2. On this computer open your browser and go to `http://localhost:8080`.
3. On phones / other computers connected to the SAME WiFi or network,
   open `http://THE-COMPUTER-IP:8080` in a browser.
   start.bat now prints the exact address to use when it launches
   (look for the line `Other devices:`). You can also find it by opening
   a Command Prompt on the app computer and running:
   `ipconfig` - look for "IPv4 Address" under your active (Wi-Fi) adapter
   (usually something like 192.168.1.10).

## Logging in

Admin account (manager):
  Email:    Khnaf@gmail.com
  Password: Admin@12345

- Change this password before going live, if you like. (Tell your developer
  to update it for you.)
- New staff can register themselves from the login page.
- The admin can add, edit, and remove users, and set each person's role
  (Admin / Manager / Staff) under "Manage > Staff" in the app.
- At least one Admin account must always remain, so a new admin must be
  added before the current one can be removed.

## Important notes

- Close the black window to STOP the app. Data is saved automatically
  to the file `data\clothncare.db`.
- BACK UP your data: occasionally copy the `data` folder to a USB stick or
  another computer. This folder is your only record of customers and orders.
- If you change networks (e.g. office to home), the IP address may change.
  Find the new IP with `ipconfig` and use that new address.
- If the firewall asks, allow access so other devices can connect.
