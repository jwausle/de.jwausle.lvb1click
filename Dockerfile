
FROM httpd:2.4.33-alpine 

COPY dist/spa-mat  /usr/local/apache2/htdocs

