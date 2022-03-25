import { createAuthorId, Author, Upwell, Draft } from "../src/index";
import { it } from "mocha";
import { assert } from "chai";

describe("upwell", () => {
  it("subscribes to document changes", async () => {
    let d = Upwell.create();
    let drafts = d.drafts();
    assert.lengthOf(drafts, 1);

    let doc: Draft = drafts[0].fork("New draft", {
      id: createAuthorId(),
      name: "Susan",
    });
    d.add(doc);
    assert.lengthOf(d.drafts(), 2);

    let times = 0;
    doc.subscribe((doc: Draft) => {
      times++;
      if (times === 1) assert.equal(doc.text, "Hello\ufffc ");
      if (times === 2) assert.equal(doc.text, "Hola\ufffc ");
    });

    doc.insertAt(0, "H");
    doc.insertAt(1, "e");
    doc.insertAt(2, "l");
    doc.insertAt(3, "l");
    doc.insertAt(4, "o");
    doc.commit("Added hello");

    doc.insertAt(0, "H");
    doc.deleteAt(1);
    doc.insertAt(1, "o");
    doc.deleteAt(2);
    doc.deleteAt(3);
    doc.insertAt(3, "a");
    doc.deleteAt(4);
    doc.commit("Translated to Spanish");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    assert.equal(times, 2);
  });

  it("saves and loads from a file", () => {
    let d = Upwell.create();
    let e = Upwell.create();

    let drafts = d.drafts();
    let ddoc = drafts[0];
    let file = ddoc.save();
    let edoc = Draft.load(ddoc.id, file, createAuthorId());
    e.add(edoc);

    ddoc.title = "Upwelling: Contextual Writing";

    let binary = ddoc.save();
    let draft = Draft.load(ddoc.id, binary, createAuthorId());
    e.add(draft);
    assert.equal(draft.title, ddoc.title);
  });

  it("creates drafts with authors", async () => {
    let first_author: Author = { id: createAuthorId(), name: "Susan" };
    let d = Upwell.create({ author: first_author });
    let drafts = d.drafts();
    let doc = drafts[0];

    doc.insertAt(0, "H");
    doc.insertAt(1, "e");
    doc.insertAt(2, "l");
    doc.insertAt(3, "l");
    doc.insertAt(4, "o");
    assert.equal(doc.text, "Hello\ufffc ");
    assert.equal(d.drafts()[0].text, "Hello\ufffc ");

    d.setLatest(doc);

    let name = "Started typing on the train";
    let author: Author = { id: createAuthorId(), name: "Theroux" };
    let e = await Upwell.deserialize(d.serialize(), author);
    let newDraft = e.createDraft(name);

    newDraft.insertAt(0, "H");
    newDraft.deleteAt(1);
    newDraft.insertAt(1, "o");
    newDraft.deleteAt(2);
    newDraft.deleteAt(3);
    newDraft.insertAt(3, "a");
    newDraft.deleteAt(4);
    assert.equal(newDraft.text, "Hola\ufffc ");
    assert.equal(newDraft.authorId, author.id);
    assert.deepEqual(e.metadata.getAuthors(), {
      [author.id]: author,
      [first_author.id]: first_author,
    });
  });

  describe("Draft", () => {
    let first_author: Author = { id: createAuthorId(), name: "Susan" };
    let d = Upwell.create({ author: first_author });
    let drafts = d.drafts();
    let doc = drafts[0];
    let rootId;
    let newDraft;
    assert.equal(drafts.length, 1);
    it("inserts text", () => {
      doc.insertAt(0, "H");
      doc.insertAt(1, "e");
      doc.insertAt(2, "l");
      doc.insertAt(3, "l");
      doc.insertAt(4, "o");
      assert.equal(doc.text, "Hello\ufffc ");
      d.setLatest(doc);
    });

    it("forks", () => {
      let name = "Started typing on the train";
      newDraft = d.createDraft(name);

      newDraft.insertAt(5, " ");
      newDraft.insertAt(6, "w");
      newDraft.insertAt(7, "o");
      newDraft.insertAt(8, "r");
      newDraft.insertAt(9, "l");
      newDraft.insertAt(10, "d");
      rootId = d.rootDraft.id;
    });

    it("merged", () => {
      doc.merge(newDraft);
      assert.equal(doc.text, "Hello world\ufffc ");

      d.add(doc);
      drafts = d.drafts();
      assert.equal(drafts.length, 2);
    });

    it("can be archived", async () => {
      d.archive(newDraft.id);
      let draft = d.history.get(0);
      assert.ok(draft);
      if (draft) {
        assert.equal(d.isArchived(draft.id), true);
        let root = d.rootDraft;
        assert.equal(root.id, rootId);
        assert.equal(doc.id, rootId);
      }
    });

    it("can get archived drafts from deserialized", async () => {
      let author = { id: createAuthorId(), name: "boop" };
      let f = await Upwell.deserialize(d.serialize(), author);
      let e = await Upwell.deserialize(f.serialize(), author);
      let draft = e.history.get(0);
      assert.ok(draft);
    });
  });

  it("makes drafts visible and shared", async () => {
    let first_author: Author = { id: createAuthorId(), name: "Susan" };
    let d = Upwell.create({ author: first_author });
    let drafts = d.drafts();
    let doc = drafts[0];
    d.share(doc.id);
    assert.equal(doc.shared, true);

    let author = { id: createAuthorId(), name: "Theroux" };
    let inc = await Upwell.deserialize(d.serialize(), author);
    inc.createDraft();
    let incomingDrafts = inc.drafts();
    assert.equal(incomingDrafts.length, 2);

    let incomingShared = incomingDrafts[0];
    assert.equal(inc.getAuthorName(incomingShared.authorId), "Susan");
    assert.equal(incomingShared.shared, true);
    assert.equal(d.isArchived(incomingShared.id), false);
  });

  it("gets root draft", () => {
    let first_author: Author = { id: createAuthorId(), name: "Susan" };
    let d = Upwell.create({ author: first_author });
    let drafts = d.drafts();
    let doc = drafts[0];
    let root = d.rootDraft;
    assert.deepEqual(root.text, doc.text);
    assert.deepEqual(root.title, doc.title);

    d.add(doc.fork("beep boop", { id: createAuthorId(), name: "john" }));

    root = d.rootDraft;
    assert.deepEqual(root.text, doc.text);
    assert.deepEqual(root.title, doc.title);
  });

  it("maintains keys when multiple documents involved", () => {
    let first_author: Author = { id: createAuthorId(), name: "Susan" };
    let d = Upwell.create({ author: first_author });

    let og = d.drafts()[0];

    let draft = og.fork("", first_author);
    d.add(draft);
    d.share(draft.id);

    let boop = draft.fork("", first_author);
    d.add(boop);

    assert.equal(d.drafts().filter((l) => l.shared).length, 1);

    boop = boop.fork("", first_author);
    d.add(boop);
    d.share(boop.id);

    boop = boop.fork("", first_author);
    d.add(boop);

    for (let i = 0; i < 100; i++) {
      assert.equal(d.drafts().filter((l) => l.shared).length, 2);
    }
  });
});
