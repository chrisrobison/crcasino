#!/bin/bash

for f in "$@"
do
   /usr/local/bin/lame -V 2 "$f"
done

