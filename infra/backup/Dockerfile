FROM mysql:8.0

COPY backup.sh /usr/local/bin/feedbackcell-backup
# o script pode chegar com CRLF de um checkout no Windows sem o .gitattributes aplicado
RUN sed -i 's/\r$//' /usr/local/bin/feedbackcell-backup && chmod 0755 /usr/local/bin/feedbackcell-backup

ENTRYPOINT ["/usr/local/bin/feedbackcell-backup"]
