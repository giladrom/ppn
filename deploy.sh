#!/bin/sh

ionic build --prod -- --aot=false --build-optimizer=false
firebase deploy --only hosting:huan-ppn
