FROM busybox:1.36

WORKDIR /www

COPY src ./

EXPOSE 3000

CMD ["httpd", "-f", "-p", "3000", "-h", "/www"]
