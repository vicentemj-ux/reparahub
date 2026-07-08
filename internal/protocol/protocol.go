package protocol

import "encoding/json"

const (
	MessageAuthHello   = "auth.hello"
	MessageAuthOK      = "auth.ok"
	MessageAuthError   = "auth.error"
	MessagePrintJob    = "print.job"
	MessagePrintAccept = "print.accepted"
	MessagePrintDone   = "print.done"
	MessagePrintError  = "print.error"
	MessageServerError = "server.error"
)

type Envelope struct {
	Type      string          `json:"type"`
	RequestID string          `json:"requestId"`
	Payload   json.RawMessage `json:"payload"`
}

type AuthHelloPayload struct {
	PairingToken string `json:"pairingToken"`
	TenantID     string `json:"tenantId"`
	Client       string `json:"client"`
}

type PrintJobPayload struct {
	JobID         string        `json:"jobId"`
	TenantID      string        `json:"tenantId"`
	PrinterTarget PrinterTarget `json:"printerTarget"`
	Document      Document      `json:"document"`
	Meta          PrintMeta     `json:"meta"`
}

type PrinterTarget struct {
	Mode string `json:"mode"`
	Name string `json:"name,omitempty"`
}

type Document struct {
	Format  string `json:"format"`
	Content string `json:"content"`
}

type PrintMeta struct {
	Source     string `json:"source"`
	PaperWidth int    `json:"paperWidth"`
	Copies     int    `json:"copies"`
}

