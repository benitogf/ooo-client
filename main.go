package main

import "github.com/benitogf/ooo"

func main() {
	app := ooo.Server{}
	app.ForcePatch = true
	app.Start("localhost:8880")
	app.WaitClose()
}
