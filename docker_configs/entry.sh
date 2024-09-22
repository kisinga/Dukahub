#!/bin/sh
set -e

# Start SSH service
/usr/sbin/sshd

# Start the main application
pantrify serve --http=0.0.0.0:80
