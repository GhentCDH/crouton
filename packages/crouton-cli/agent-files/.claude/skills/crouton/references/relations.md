# Relations — recipes

## manyToOne (autocomplete lookup)

Use when: the current resource has a foreign-key column pointing to another resource (e.g. `book.authorId → author.id`).

```json
{
  "columns": {
    "authorId": {
      "fieldInput": {
        "type": "autocomplete",
        "resource": "author",
        "labelField": "name"
      }
    }
  },
  "relations": {
    "author": {
      "type": "manyToOne",
      "resource": "author",
      "foreignKey": "authorId"
    }
  }
}
```

Required fields: `type`, `resource`, `foreignKey`.
The `foreignKey` must be a column that exists in **this** resource.

## oneToMany (embedded table)

Use when: another resource has a FK pointing to this one (e.g. `review.bookId → book.id`).

```json
{
  "relations": {
    "reviews": {
      "type": "oneToMany",
      "resource": "review",
      "foreignKey": "bookId"
    }
  }
}
```

Required fields: `type`, `resource`, `foreignKey`.
The `foreignKey` must be a column that exists in the **target** resource.

## manyToMany (join table)

Use when: a join table connects both resources.

```json
{
  "relations": {
    "tags": {
      "type": "manyToMany",
      "resource": "tag",
      "through": "bookTag",
      "foreignKey": "bookId",
      "otherKey": "tagId"
    }
  }
}
```

## Column vs relation distinction

- **Column** (`columns[].fieldInput.type: "autocomplete"`) — controls how the FK field renders in the form.
- **Relation** (`relations[]`) — controls whether a related table/panel appears on the detail page.
- Both can exist together for the same logical link; they serve different purposes.
