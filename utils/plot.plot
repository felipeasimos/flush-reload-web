set autoscale y;
set style data points;
plot '../data/report.plot' using 0:1 title 'Square' with points pointtype 4 lc rgb 'blue',\
'../data/report.plot' using 0:2 with points title 'reduce' pointtype 6 lc rgb 'black',\
'../data/report.plot' using 0:3 title 'Mul' with points pointtype 2 lc rgb 'green';
set arrow from 0,160 to 100000,160 nohead
pause -1 'Hit any key to continue'
