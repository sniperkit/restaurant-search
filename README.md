# Restaurant Search #

This work-in-progress represents a prototype semantic search application that I'm developing as part of my master's
thesis at [Keio University](http://www.sfc.keio.ac.jp/). You can get a better understanding of the goals of this system
by referring to the [overview](https://github.com/FooSoft/search-slides/archive/master.zip) presentation. The prototype
is open-source and those who are interested are encouraged to [clone the project](https://github.com/FooSoft/search) and
tinker with it. You may also access a [live snapshot](http://foosoft.net:8080/) of the prototype on my server.

This installation guide is designed with [Ubuntu](http://www.ubuntu.com/)-based distributions in mind (I'm using [Linux
Mint](http://www.linuxmint.com/) for development), but I expect it to be trivial to get this application running on
other flavors of Linux. If you run into any problems, let me know.


## Installation ##

1.  Install the system dependencies:

    ```
    # apt-get install mysql-server nodejs-legacy nodejs npm
    ```

2.  Install the Node dependencies:

    ```
    # npm install -g bower
    ```

3.  Install the Go tool chain:

    ```
    $ wget https://godeb.s3.amazonaws.com/godeb-amd64.tar.gz
    $ tar xzvf godeb-amd64.tar.gz
    # ./godeb install
    ```

4.  Set the `GOPATH` environment variable (read the docs).

5.  Install the search application:

    ```
    $ go get github.com/FooSoft/search
    ```

6.  Initialize the database (from the `search/db` directory):

    ```
    $ ./init.sh
    $ ./load.sh
    ```

7.  Install the client libraries (from the `search/static` directory):

    ```
    $ bower install
    ```

8.  Build and start the server (from the `search` directory):

    ```
    $ go build
    $ ./server
    ```

9.  Access the web application at `localhost:8080`.
