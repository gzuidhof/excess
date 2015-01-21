if not exist "dist" mkdir dist

java -jar ../tools/compiler.jar --compilation_level WHITESPACE_ONLY --formatting=pretty_print  --js adapter.js --js excess.js --js phoenix.js --js_output_file dist/excess.js
java -jar ../tools/compiler.jar --js adapter.js --js excess.js --js phoenix.js --js_output_file dist/excess.min.js

copy "excess.d.ts" "dist\excess.d.ts"