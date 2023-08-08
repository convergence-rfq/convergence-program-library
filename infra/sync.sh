#!/bin/bash

SCRIPT_PATH=$(readlink -f "$0")
CPL_PATH=$(dirname $(dirname $SCRIPT_PATH))

rsync -r $CPL_PATH --exclude='.anchor' --exclude='.git' --exclude='node_modules' --exclude='target' \
    root@159.223.108.86:/root/