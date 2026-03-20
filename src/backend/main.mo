import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";

actor {
  public type Clip = {
    id : Nat;
    title : Text;
    videoUrl : Text;
    startTime : Nat;
    endTime : Nat;
    createdAt : Int;
  };

  module Clip {
    public func compare(clip1 : Clip, clip2 : Clip) : Order.Order {
      Int.compare(clip2.createdAt, clip1.createdAt);
    };
  };

  var nextId = 1;

  let clips = Map.empty<Nat, Clip>();

  public shared ({ caller }) func createClip(title : Text, videoUrl : Text, startTime : Nat, endTime : Nat) : async {
    id : Nat;
    timestamp : Int;
  } {
    if (startTime >= endTime) {
      Runtime.trap("Start time must be less than end time");
    };

    let currentId = nextId;
    let currentTime = Time.now();

    let clip : Clip = {
      id = currentId;
      title;
      videoUrl;
      startTime;
      endTime;
      createdAt = currentTime;
    };

    clips.add(currentId, clip);
    nextId += 1;
    { id = currentId; timestamp = currentTime };
  };

  public query ({ caller }) func getAllClips() : async [Clip] {
    clips.values().toArray().sort();
  };

  public shared ({ caller }) func deleteClip(id : Nat) : async () {
    if (not clips.containsKey(id)) {
      Runtime.trap("Clip not found");
    };
    clips.remove(id);
  };
};
