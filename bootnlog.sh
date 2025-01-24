#!/bin/bash
echo "Calling boot n log..."
pm2 flush
pm2 restart reQuote
clear
pm2 logs
