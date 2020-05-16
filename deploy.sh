#!/bin/sh

#ionic build --prod -- --aot=false --build-optimizer=false

ionic build --prod --release
firebase deploy --only hosting:huan-ppn
