In order to deploy to Azure

create a storage account, and into it create a file share. Note down it's name for use at a later stage

create a web app
Basics Tab
Be careful about the resource group, it now defaults to creating a new one instead of reusing the already existing ones
These are the importnant parts:
Publish: Container
OS: Linux

Container Tab
Image source: Dckerhub or other registries
Options: Single container
Access Type: Private
Registry server URL: https://ghcr.io
Username: Github usernmae
Password: Create a personal access token (classic) with the repo and read:packages scopes.

Once the service is started, you need to allow deplyment through github actions
This causes github actions to run on certain triggers and deply to your azure service
you may get this error:
SCM basic authentication is disabled for your app. Click here to go to your configuration settings to enable.
Follow the instructions and click on it

Turn on SCM basic authentication, and while on that configuration page
(you can always come back to this page through the settings tab)
Click on path mappings and remember that file share? use it here.
Storage type : Azure files
Protocol: SMB
Storage container: (use that file share)

Navgate back to Deployment centre and on source choose github actions

Special considerations:
Enabling azure web ssh into the docker image requires some special tweaking of the image:
Install ssh into the image
allow ssh through port 2222

For now manually upload html files to pb_public folder in the shared sirectory.
It's contents will be served when someone visits the homepage.
Moving forward, I should find a way of mounting this folder and allowiing something from the build stage be persisted INTO it,
or manually have a separate folder being the publicly served folder
