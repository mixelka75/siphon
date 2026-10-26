package frida

import (
	"reflect"

	"github.com/godbus/dbus/v5"
)

// godbus отдаёт структуры как []interface{}, массивы структур — как
// [][]interface{} (или []interface{}), варианты — как dbus.Variant. Эти
// помощники приводят всё к простым типам.

func first(body []any) any {
	if len(body) == 0 {
		return nil
	}
	return body[0]
}

func rowOf(v any) []any {
	switch t := v.(type) {
	case []any:
		return t
	}
	return nil
}

func rowsOf(v any) [][]any {
	switch t := v.(type) {
	case [][]any:
		return t
	case []any:
		out := make([][]any, 0, len(t))
		for _, e := range t {
			if r, ok := e.([]any); ok {
				out = append(out, r)
			}
		}
		return out
	}
	return nil
}

func unwrap(v any) any {
	if vr, ok := v.(dbus.Variant); ok {
		return unwrap(vr.Value())
	}
	return v
}

func asString(v any) string {
	s, _ := unwrap(v).(string)
	return s
}

func asUint32(v any) uint32 {
	switch t := unwrap(v).(type) {
	case uint32:
		return t
	case int32:
		return uint32(t)
	case uint64:
		return uint32(t)
	case int64:
		return uint32(t)
	}
	return 0
}

func asInt(v any) int {
	switch t := unwrap(v).(type) {
	case int32:
		return int(t)
	case uint32:
		return int(t)
	case int64:
		return int(t)
	case uint64:
		return int(t)
	case int:
		return t
	}
	return 0
}

// unwrapDict превращает a{sv} (в том числе вложенные) в map[string]any.
func unwrapDict(v any) map[string]any {
	out := map[string]any{}
	rv := reflect.ValueOf(unwrap(v))
	if rv.Kind() != reflect.Map {
		return out
	}
	for _, k := range rv.MapKeys() {
		val := unwrap(rv.MapIndex(k).Interface())
		if reflect.ValueOf(val).Kind() == reflect.Map {
			out[k.String()] = unwrapDict(val)
		} else {
			out[k.String()] = val
		}
	}
	return out
}
