<p align="center">
<img src="./public/logo_full.png" alt="Jellyseerr" style="margin: 20px 0;">
</p>
<p align="center">
<img src="https://github.com/Fallenbagel/jellyseerr/actions/workflows/release.yml/badge.svg" alt="Jellyseerr Release" />
<img src="https://github.com/Fallenbagel/jellyseerr/actions/workflows/ci.yml/badge.svg" alt="Jellyseerr CI">
</p>
<p align="center">
<a href="https://discord.gg/ckbvBtDJgC"><img src="https://img.shields.io/discord/952656177924300932" alt="Discord"></a>
<a href="https://hub.docker.com/r/fallenbagel/jellyseerr"><img src="https://img.shields.io/docker/pulls/fallenbagel/jellyseerr" alt="Docker pulls"></a>
<a href="http://jellyseerr.borgcube.de/engage/jellyseerr/"><img src="http://jellyseerr.borgcube.de/widget/jellyseerr/jellyseerr-frontend/svg-badge.svg" alt="Translation status" /></a>
<a href="https://github.com/fallenbagel/jellyseerr/blob/develop/LICENSE"><img alt="GitHub" src="https://img.shields.io/github/license/fallenbagel/jellyseerr"></a>
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
<a href="#contributors-"><img alt="All Contributors" src="https://img.shields.io/badge/all_contributors-40-orange.svg"/></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->

**Jellyseerr** is a free and open source software application for managing requests for your media library.
It is a fork of [Overseerr](https://github.com/sct/overseerr) built to bring support for [Jellyfin](https://github.com/jellyfin/jellyfin) & [Emby](https://github.com/MediaBrowser/Emby) media servers!

_The original Overseerr team have been busy and Jellyfin/Emby support aren't on their roadmap, so we started this project as we wanted to bring the Overseerr experience to the Jellyfin/Emby Community!_

## Current Features

- Full Jellyfin/Emby/Plex integration including authentication with user import & management
- Supports Movies, Shows and Mixed Libraries
- Ability to change email addresses for smtp purposes
- Easy integration with your existing services. Currently, Jellyseerr supports Sonarr and Radarr. More to come!
- Jellyfin/Emby/Plex library scan, to keep track of the titles which are already available.
- Customizable request system, which allows users to request individual seasons or movies in a friendly, easy-to-use interface.
- Incredibly simple request management UI. Don't dig through the app to simply approve recent requests!
- Granular permission system.
- Support for various notification agents.
- Mobile-friendly design, for when you need to approve requests on the go!

  (Upcoming Features include: Multiple Server Instances, and much more!)

With more features on the way! Check out our [issue tracker](https://github.com/fallenbagel/jellyseerr/issues) to see the features which have already been requested.

## Getting Started

#### Pre-requisite (Important)

_*On Jellyfin/Emby, ensure the `Settings > Home > Automatically group content from the following folders into views such as 'Movies', 'Music' and 'TV'` is turned off*_

### Launching Jellyseerr using Docker (Recommended)

Check out our docker hub for instructions on how to install and run Jellyseerr:
https://hub.docker.com/r/fallenbagel/jellyseerr

### Building from source (ADVANCED):

#### Windows

Pre-requisites:

- Nodejs [v18](https://nodejs.org/download/release/v18.18.2)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install)
- Download/git clone the source code from the github (Either develop branch or main for stable)

```cmd
npm i -g win-node-env
set CYPRESS_INSTALL_BINARY=0
yarn install --frozen-lockfile --network-timeout 1000000
yarn run build
yarn start
```

(You can use task scheduler to run a bat script with `@echo off` and `yarn start` to run jellyseerr in the background)

_To set env variables such as `JELLYFIN_TYPE=emby` create a file called `.env` in the root directory of jellyseerr_

#### Linux

**Pre-requisites:**

- Nodejs [v18](https://nodejs.org/en/download/package-manager)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install) (on Debian based distros, the package manager provided `yarn` is different and is a package called cmdlet. You can remove that using `apt-remove cmdlet` then install yarn using `npm install -g yarn`)
- Git

**Steps:**

1. Assuming you want the root folder for the jellyseerr source code to be cloned to `/opt`

```bash
cd /opt
```

2. Then execute the following commands to clone and checkout to the stable version

```bash
git clone https://github.com/Fallenbagel/jellyseerr.git && cd jellyseerr
git checkout main
```

3. Then install the dependencies and build the dist

```bash
CYPRESS_INSTALL_BINARY=0 yarn install --frozen-lockfile --network-timeout 1000000
yarn run build
```

4. Now you can start jellyseerr using `yarn start` and opening http://localhost:5055 in your browser.

5. If you want to run jellyseerr as a _Systemd-service:_

- assuming jellyseerr was cloned to `/opt/`
- first create the environment file at `/etc/jellyseerr/jellyseerr.conf`

Environment file:

```
# Jellyseerr's default port is 5055, if you want to use both, change this.
# specify on which port to listen
PORT=5055

# specify on which interface to listen, by default jellyseerr listens on all interfaces
#HOST=127.0.0.1

# Uncomment if your media server is emby instead of jellyfin.
# JELLYFIN_TYPE=emby
```

- Then run the command `which node` to find your node path (assuming it's at `/usr/bin/node`)
- Then create the service file using `sudo systemctl edit jellyseerr.service` or creating and editing a file at `/etc/systemd/system/jellyseerr.service`

Service file contents:

```
[Unit]
Description=Jellyseerr Service
Wants=network-online.target
After=network-online.target

[Service]
EnvironmentFile=/etc/jellyseerr/jellyseerr.conf
Environment=NODE_ENV=production
Type=exec
Restart=on-failure
WorkingDirectory=/opt/jellyseerr
ExecStart=/usr/bin/node dist/index.js

[Install]
WantedBy=multi-user.target
```

### Packages:

Archlinux: [AUR](https://aur.archlinux.org/packages/jellyseerr)
Nixpkg: [Nixpkg](https://search.nixos.org/packages?channel=unstable&show=jellyseerr)
Snap: [Snap](https://snapcraft.io/jellyseerr)

## Preview

<img src="./public/preview.jpg">

## Support

- You can get support on [Discord](https://discord.gg/ckbvBtDJgC).
- You can ask questions in the Help category of our [GitHub Discussions](https://github.com/fallenbagel/jellyseerr/discussions).
- Bug reports and feature requests can be submitted via [GitHub Issues](https://github.com/fallenbagel/jellyseerr/issues).

## API Documentation

You can access the API documentation from your local Jellyseerr install at http://localhost:5055/api-docs

## Community

You can ask questions, share ideas, and more in [GitHub Discussions](https://github.com/fallenbagel/jellyseerr/discussions).

If you would like to chat with other members of our growing community, [join the Jellyseerr Discord server](https://discord.gg/ckbvBtDJgC)!

Our [Code of Conduct](https://github.com/fallenbagel/jellyseerr/blob/develop/CODE_OF_CONDUCT.md) applies to all Jellyseerr community channels.

## Contributing

You can help improve Jellyseerr too! Check out our [Contribution Guide](https://github.com/fallenbagel/jellyseerr/blob/develop/CONTRIBUTING.md) to get started.

----

## ❤️ Support me

<!--
Pwease support me >.<
-->  

<p>Since I work full-time on open-source projects spread across my organizations, my only source of income is donations from people like you that use & appreciate my stuff. So, if you can spare a dollar or two, I would really appreciate that. All the money goes towards paying rent, essentials like food, drinks etc, and most importantly it will be used to fuel my cookie addiction🍪<br></p>

**Crypto:**
- **XMR**: `42xc4qPZyfi4wzAkCBXSoMSo3BLDS8946J89JXDqtT5gRj6uYpfhjQF12NLPMxtqGDL2RxoWXjB73iYdBP8DX7SqGvdbdtb`<br>
- **USDT (TRX20):** `TWg6VDUBase3HDA6RxAwTVjQw4SbxoGyqZ`<br>
- **USDT (ERC20):** `0x841251438A8Fb2B16298C15B10feA9Fd2cEA3405`<br>
- **Doge:** `DCKAFtgw6686uEMaFzZfCtUajS9VjPJLMm`<br>
- **BTC:** `bc1qje8qy7gpudm8hhyx43n9xndg7d8xj5f7dh6m4p`<br>

**Fiat:**
- **[Patreon](https://patreon.com/crazyco) (Fee: 8%\*)**: ❤️ Account needed, subscription with perks
- **[ko-fi](https://ko-fi.com/crazyco) (Fee: 2%\*)**: No account needed, subscription or one-time donation
- **[Wire-transfer](https://bunq.me/ClaraK) (Fee: 0%\*)**: No account needed, one-time donation
- **[Paypal](https://paypal.me/ClaraCrazy)\*\* (Fee: 2%\*)**: Account needed, one-time donation

\* Fee is calculated by how much I will lose when cashing out<br>
\*\* Please make sure to select *Friends and Family*<br><br>
**Thanks for all your support <3**
